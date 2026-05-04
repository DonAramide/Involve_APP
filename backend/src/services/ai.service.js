// backend/src/services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase } = require('../config/supabase');
const crypto = require('crypto');

/**
 * Service for handling AI-generated Lesson Notes with multi-layer caching.
 * Now supports dynamic API key management via Supabase.
 */
class AIService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.currentApiKey = null;
        this.lastFetched = 0;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for the API key
    }

    /**
     * Ensures we have a valid Gemini model instance with the latest key.
     */
    async _ensureInitialized() {
        const apiKey = await this._getApiKey();
        
        if (!apiKey) {
            throw new Error('Gemini API Key not configured. Please set it in Supabase system_config or .env');
        }

        // Re-initialize if the key has changed
        if (apiKey !== this.currentApiKey || !this.model) {
            const isFromDb = apiKey && apiKey !== process.env.GEMINI_API_KEY;
            console.log(`[AI Init] Initializing Gemini with ${isFromDb ? 'DB Key' : 'Env Key'} (Length: ${apiKey.length})`);
            this.currentApiKey = apiKey;
            this.genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
            this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        }
    }

    /**
     * Fetches the Gemini API key from Supabase with in-memory caching.
     */
    async _getApiKey() {
        const now = Date.now();
        
        // Return cached key if valid
        if (this.currentApiKey && (now - this.lastFetched < this.CACHE_TTL)) {
            return this.currentApiKey;
        }

        try {
            console.log('[AI Config] Fetching API key from Supabase...');
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'gemini_api_key')
                .maybeSingle();

            if (error) throw error;

            if (data?.config_value) {
                this.lastFetched = now;
                return data.config_value;
            }
        } catch (e) {
            console.error('[AI Config] Failed to fetch key from DB, falling back to ENV:', e.message);
        }

        // Fallback to Env variable
        return process.env.GEMINI_API_KEY;
    }

    /**
     * Generates a lesson note using Gemini with strict NERDC persona and caching.
     */
    async generateLessonNote({ className, subjectName, term, week, topic, schoolId, teacherId, forceRefresh }) {
        // 0. Ensure AI is initialized with latest key
        await this._ensureInitialized();

        // 1. Generate Metadata Hash for Cache Identification
        const cacheHash = this._generateHash({ className, subjectName, term, week, topic });

        // 2. Check Cache (if not forced)
        if (!forceRefresh) {
            const cachedNote = await this._checkCache(cacheHash, schoolId);
            if (cachedNote) {
                console.log(`[AI Cache] Hit for hash: ${cacheHash}`);
                return cachedNote;
            }
        }

        // 3. AI Generation (Persona: NERDC Expert Teacher)
        console.log(`[AI Gen] Generating for: ${topic} (${className})`);
        
        const systemPrompt = `
You are an expert Nigerian teacher trained in the NERDC curriculum.
You generate structured, classroom-ready lesson notes used in Nigerian primary and secondary schools.

STRICT RULES:
- No missing sections.
- No vague explanations.
- Use clear, simple English suitable for ${className}.
- Include practical examples relevant to Nigerian students.
- Do not include explanations outside the lesson note.
- Do not add commentary.

RESPONSE FORMAT: 
Return ONLY a valid JSON object matching this schema exactly:
{
  "topic": "string",
  "learning_objectives": ["string"],
  "introduction": "string",
  "main_content": [
    { "heading": "string", "explanation": "string" }
  ],
  "examples": ["string"],
  "class_activity": ["string"],
  "assessment": ["string"],
  "summary": "string"
}
`;

        const userPrompt = `Generate a lesson note for ${className}, ${subjectName}. 
Term: ${term}, Week: ${week}. 
Topic: ${topic}`;

        const result = await this.model.generateContent([systemPrompt, userPrompt]);
        const response = await result.response;
        const text = response.text();

        // Parse and Validate JSON
        let parsedNote;
        try {
            // Remove markdown format if AI included it
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedNote = JSON.parse(cleanText);
        } catch (e) {
            console.error('AI Response Parsing Failed:', text);
            throw new Error('AI returned malformed content. Please try again.');
        }

        // 4. Save to Cache
        await this._saveToCache(cacheHash, schoolId, teacherId, parsedNote);

        return parsedNote;
    }

    /**
     * Checks Supabase for a cached lesson note.
     */
    async _checkCache(hash, schoolId) {
        const { data, error } = await supabase
            .from('lesson_notes_cache')
            .select('note_content')
            .eq('content_hash', hash)
            .or(`school_id.eq.${schoolId},is_global.eq.true`)
            .order('is_global', { ascending: true }) 
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Supabase Cache Error:', error);
            return null;
        }

        return data?.note_content;
    }

    /**
     * Stores a generated note in the Supabase cache and logs usage.
     */
    async _saveToCache(hash, schoolId, teacherId, content) {
        const { error } = await supabase
            .from('lesson_notes_cache')
            .upsert({
                content_hash: hash,
                school_id: schoolId,
                teacher_id: teacherId,
                note_content: content,
                is_global: true, 
                generated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Supabase Cache Save Error:', error);
        }

        // Usage Tracking
        await this._logUsage(schoolId, teacherId);
    }

    async _logUsage(schoolId, teacherId) {
        const { error } = await supabase
            .from('ai_generation_logs')
            .insert({
                school_id: schoolId,
                teacher_id: teacherId,
                feature: 'lesson_note',
                timestamp: new Date().toISOString()
            });

        if (error) console.error('Usage Log Error:', error);
    }

    _generateHash(metadata) {
        const str = JSON.stringify(metadata).toLowerCase();
        return crypto.createHash('sha256').update(str).digest('hex');
    }
}

module.exports = new AIService();
