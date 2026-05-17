// src/services/ai.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../db/supabase';
import crypto from 'crypto';

export class AIService {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;
  private static currentKey: string | null = null;

  private static async ensureInitialized() {
    // 1. Fetch Key (Check system_config first, then ENV)
    const { data } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'gemini_api_key')
      .maybeSingle();

    const apiKey = data?.config_value || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error('Gemini API key not configured');

    // 2. Initialize if key changed or first time
    if (apiKey !== this.currentKey || !this.model) {
      console.log(`[AI] Initializing Gemini 2.5 with ${data?.config_value ? 'DB' : 'ENV'} key`);
      this.currentKey = apiKey;
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    }
  }

  static async generateLessonNote(params: any) {
    await this.ensureInitialized();
    const { className, subjectName, term, week, tenantId, forceRefresh } = params;

    // 0. Resolve Topic from Curriculum if missing
    let topic = params.topic;
    if (!topic) {
      const { data: cur } = await supabase
        .from('curriculum_topics')
        .select('topic, subtopics')
        .match({ subject: subjectName, class_level: className, term, week })
        .maybeSingle();
      
      if (!cur) throw new Error('Topic not found in curriculum');
      topic = cur.topic;
    }

    // 1. Hierarchical Cache Check (Tenant -> Global)
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${subjectName}|${topic}|${className}|${term}|${week}`.toLowerCase())
      .digest('hex');

    const startTime = Date.now();

    if (!forceRefresh) {
      // Priority 1: Tenant Cache | Priority 2: Global Cache (tenant_id is null)
      const { data: cached } = await supabase
        .from('lesson_notes')
        .select('content')
        .eq('cache_key', cacheKey)
        .order('tenant_id', { ascending: false, nullsFirst: false }) 
        .limit(1)
        .maybeSingle();

      if (cached) {
        // Log Cache Hit
        await supabase.from('ai_usage').insert({
          tenant_id: tenantId,
          request_type: 'lesson_note',
          source: 'cache',
          response_time_ms: Date.now() - startTime
        });
        return cached.content;
      }
    }

    // 2. Billing Check (Gatekeeper)
    const { BillingService } = require('./billing.service');
    const quota = await BillingService.checkQuota(tenantId);
    if (!quota.allowed) {
      throw new Error('QUOTA_EXCEEDED: You have reached your monthly AI generation limit. Please upgrade your plan to continue.');
    }

    // 3. AI Generation (Persona: NERDC Expert)
    const systemPrompt = `You are a Senior Nigerian Pedagogy Expert (NERDC standards). 
    Generate a high-quality lesson note for:
    - Subject: ${subjectName}
    - Class: ${className}
    - Topic: ${topic}
    - Term: ${term}, Week: ${week}

    You MUST return a JSON object with two fields:
    1. "structured": A detailed object containing: objectives (list), materials (list), introduction (text), steps (list of structured steps), evaluation (list), assignment (text).
    2. "markdown": A beautiful, print-ready Markdown version of the same content.

    Return ONLY raw JSON. No markdown backticks.`;
    
    const result = await this.model!.generateContent([systemPrompt]);
    const response = await result.response;
    const rawText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const content = JSON.parse(rawText);

    // 3. Multi-Layer Persistence
    // We save as a GLOBAL entry (tenant_id = NULL) to benefit everyone
    await supabase.from('lesson_notes').upsert({
      tenant_id: null, // Global cache
      subject: subjectName,
      topic,
      class_level: className,
      term,
      week,
      content,
      cache_key: cacheKey,
      is_global: true
    });

    // 4. Usage Tracking & Onboarding Activation
    await supabase.from('ai_usage').insert({
      tenant_id: tenantId,
      request_type: 'lesson_note',
      source: 'ai',
      response_time_ms: Date.now() - startTime,
      cost: 0 // Baseline for future billing
    });

    const { data: tenantRaw } = await supabase.from('tenants').select('onboarded_at, last_active_at').eq('id', tenantId).single();

    // Update Activity Temporal Signal
    await supabase.from('tenants').update({ last_active_at: new Date().toISOString() }).eq('id', tenantId);

    // Mark school as onboarded on first successful AI generation
    if (tenantRaw?.onboarded_at === null) {
      await supabase.from('tenants')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('id', tenantId);
      
      // Trigger Growth Reward Logic
      const { ReferralService } = require('./referral.service');
      await ReferralService.applyReward(tenantId);
    }

    // 5. Upgrade Alerts (90% Threshold)
    const status = await BillingService.getBillingStatus(tenantId);
    if (status.percentage >= 90) {
       const { NotificationService } = require('./invite.service');
       await NotificationService.sendQuotaWarning(tenantId, status.usage, status.limit);
    }

    return content;
  }
}
