-- 1. Combined School Owner Insights RPC
CREATE OR REPLACE FUNCTION get_tenant_dashboard_stats(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
    v_timeseries JSONB;
    v_subject_stats JSONB;
    v_leaderboard JSONB;
    v_last_30_days DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
    -- A. KPI Metrics
    SELECT jsonb_build_object(
        'total_notes', (SELECT count(*) FROM lesson_notes WHERE tenant_id = p_tenant_id),
        'total_teachers', (SELECT count(*) FROM users WHERE tenant_id = p_tenant_id AND role = 'staff'),
        'active_teachers_7d', (SELECT count(DISTINCT user_id) FROM ai_usage WHERE tenant_id = p_tenant_id AND created_at > NOW() - INTERVAL '7 days'),
        'most_active_subject', (SELECT subject FROM lesson_notes WHERE tenant_id = p_tenant_id GROUP BY subject ORDER BY count(*) DESC LIMIT 1)
    ) INTO v_metrics;

    -- B. Daily Note Volume (Last 30 Days)
    SELECT jsonb_agg(t) INTO v_timeseries FROM (
        SELECT 
            d.date::date as display_date,
            COALESCE(count(u.id), 0) as notes_count
        FROM generate_series(v_last_30_days, CURRENT_DATE, '1 day'::interval) d(date)
        LEFT JOIN ai_usage u ON u.created_at::date = d.date::date AND u.tenant_id = p_tenant_id AND u.request_type = 'lesson_note'
        GROUP BY d.date
        ORDER BY d.date
    ) t;

    -- C. Subject Distribution
    SELECT jsonb_agg(s) INTO v_subject_stats FROM (
        SELECT 
            subject, 
            count(*) as note_count
        FROM lesson_notes 
        WHERE tenant_id = p_tenant_id
        GROUP BY subject 
        ORDER BY note_count DESC
    ) s;

    -- D. Teacher Leaderboard (Last 7 Days)
    SELECT jsonb_agg(l) INTO v_leaderboard FROM (
        SELECT 
            u.name,
            count(a.id) as generations
        FROM users u
        LEFT JOIN ai_usage a ON a.user_id = u.id AND a.created_at > NOW() - INTERVAL '7 days'
        WHERE u.tenant_id = p_tenant_id AND u.role = 'staff'
        GROUP BY u.id, u.name
        ORDER BY generations DESC
        LIMIT 5
    ) l;

    RETURN jsonb_build_object(
        'metrics', v_metrics,
        'timeseries', v_timeseries,
        'subjects', v_subject_stats,
        'leaderboard', v_leaderboard
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
