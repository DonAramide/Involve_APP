import { Request, Response } from 'express';
import { BuildVariantService } from '../config/build-variant';
import { supabaseProjectUrl } from '../utils/supabase-jwt';

let readyOverride: boolean | null = null;

/** Test helper — do not use in production paths. */
export function __setReadyOverrideForTests(value: boolean | null) {
  readyOverride = value;
}

/**
 * Health contract (Phase 3):
 *   GET /livez  — process alive (no dependency checks)
 *   GET /readyz — ready for traffic (config + optional DB ping)
 *   GET /health — compatibility alias documenting both
 */
export class HealthController {
  static livez(_req: Request, res: Response) {
    return res.status(200).json({
      status: 'ok',
      check: 'livez',
      timestamp: new Date().toISOString(),
    });
  }

  static async readyz(_req: Request, res: Response) {
    if (readyOverride === false) {
      return res.status(503).json({ status: 'not_ready', check: 'readyz', reason: 'override' });
    }
    if (readyOverride === true) {
      return res.status(200).json({ status: 'ready', check: 'readyz', override: true });
    }

    const variant = BuildVariantService.getInstance();
    const problems: string[] = [];

    try {
      if (variant.isStaging() || variant.isProd()) {
        const cfg = variant.getSupabaseConfig();
        if (!cfg.url || !cfg.key) problems.push('supabase_config');
        if (!process.env.JWT_SECRET) problems.push('JWT_SECRET');
        
        const hasValidSecret = process.env.SUPABASE_JWT_SECRET && process.env.SUPABASE_JWT_SECRET.length >= 16;
        const supabaseUrl = supabaseProjectUrl();
        const hasValidJwks = supabaseUrl && !supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost');

        if (!hasValidSecret && !hasValidJwks) {
          problems.push('SUPABASE_JWT_CONFIG');
        }
      }
    } catch (err: any) {
      problems.push(`config:${err?.message || 'invalid'}`);
    }

    // Soft DB ping when supabase admin is available — failure marks not ready in staging/prod
    try {
      const { supabaseAdmin } = require('../db/supabase');
      if (supabaseAdmin && (variant.isStaging() || variant.isProd())) {
        const ping = await Promise.race([
          supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('db_ping_timeout')), 3000)),
        ]);
        if ((ping as any)?.error) problems.push('database');
      }
    } catch {
      if (variant.isStaging() || variant.isProd()) {
        problems.push('database');
      }
    }

    if (problems.length) {
      return res.status(503).json({
        status: 'not_ready',
        check: 'readyz',
        problems,
        variant: variant.getVariant(),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: 'ready',
      check: 'readyz',
      variant: variant.getVariant(),
      timestamp: new Date().toISOString(),
    });
  }

  /** Compatibility endpoint — prefer /livez and /readyz. */
  static async health(req: Request, res: Response) {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      variant: BuildVariantService.getInstance().getVariant(),
      contract: {
        livez: '/livez',
        readyz: '/readyz',
        health: '/health (compatibility; does not gate traffic)',
      },
    });
  }
}
