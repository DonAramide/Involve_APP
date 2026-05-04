-- c:\dev\Involve_APP\backend\database\class_insights_rpc.sql

CREATE OR REPLACE FUNCTION get_class_engagement_stats(p_tenant_id UUID, p_class_level TEXT)
RETURNS JSONB AS $$
DECLARE
    v_attendance_rate FLOAT;
    v_total_lessons INT;
    v_last_lesson_topic TEXT;
    v_frequent_absentees JSONB;
    v_coverage JSONB;
    v_recent_attendance_trend JSONB;
BEGIN
    -- 1. Class Summary
    -- Attendance rate (last 7 days)
    SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'present' OR status = 'late'))::FLOAT / NULLIF(COUNT(*), 0) * 100, 
        0
    ) INTO v_attendance_rate
    FROM student_attendance sa
    JOIN attendance_records ar ON sa.record_id = ar.id
    WHERE ar.tenant_id = p_tenant_id 
      AND ar.class_level = p_class_level
      AND ar.date >= CURRENT_DATE - INTERVAL '7 days';

    -- Total lessons generated for this class
    SELECT COUNT(*) INTO v_total_lessons
    FROM lesson_notes
    WHERE tenant_id = p_tenant_id AND class_level = p_class_level;

    -- Last lesson topic
    SELECT topic INTO v_last_lesson_topic
    FROM lesson_notes
    WHERE tenant_id = p_tenant_id AND class_level = p_class_level
    ORDER BY created_at DESC LIMIT 1;

    -- 2. Attendance Patterns
    -- Frequent absentees (>= 3 absences in the last 14 days)
    SELECT jsonb_agg(absentees) INTO v_frequent_absentees FROM (
        SELECT s.full_name, COUNT(*) as absence_count
        FROM student_attendance sa
        JOIN attendance_records ar ON sa.record_id = ar.id
        JOIN students s ON sa.student_id = s.id
        WHERE ar.tenant_id = p_tenant_id 
          AND ar.class_level = p_class_level
          AND ar.date >= CURRENT_DATE - INTERVAL '14 days'
          AND sa.status = 'absent'
        GROUP BY s.id, s.full_name
        HAVING COUNT(*) >= 3
        ORDER BY absence_count DESC
    ) absentees;

    -- Daily attendance rates (last 7 days for trend analysis)
    SELECT jsonb_agg(trend) INTO v_recent_attendance_trend FROM (
        SELECT 
            ar.date,
            (COUNT(*) FILTER (WHERE sa.status = 'present' OR sa.status = 'late'))::FLOAT / NULLIF(COUNT(*), 0) * 100 as rate
        FROM attendance_records ar
        JOIN student_attendance sa ON sa.record_id = ar.id
        WHERE ar.tenant_id = p_tenant_id AND ar.class_level = p_class_level
          AND ar.date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ar.date
        ORDER BY ar.date ASC
    ) trend;

    -- 3. Lesson Coverage (Focus on Mathematics and English)
    SELECT jsonb_agg(cov) INTO v_coverage FROM (
        SELECT 
            subject,
            MAX(week) as weeks_completed,
            12 as total_weeks,
            (MAX(week)::FLOAT / 12.0) * 100 as progress_percentage
        FROM lesson_notes
        WHERE tenant_id = p_tenant_id AND class_level = p_class_level
          AND subject IN ('Mathematics', 'English Language', 'English')
        GROUP BY subject
    ) cov;

    RETURN jsonb_build_object(
        'attendance_rate_7d', v_attendance_rate,
        'total_lessons', v_total_lessons,
        'last_lesson_topic', v_last_lesson_topic,
        'frequent_absentees', COALESCE(v_frequent_absentees, '[]'::jsonb),
        'attendance_trend', COALESCE(v_recent_attendance_trend, '[]'::jsonb),
        'core_coverage', COALESCE(v_coverage, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
