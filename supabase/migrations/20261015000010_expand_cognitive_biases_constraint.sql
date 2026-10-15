-- Mở rộng check constraint trên cột messages.fallacy_code để hỗ trợ đầy đủ 11 lỗi lập luận:
-- 6 ngụy biện cốt lõi + 5 thiên kiến nhận thức (bổ sung OVERCONFIDENCE_BIAS và INGROUP_BIAS).

alter table public.messages drop constraint if exists messages_fallacy_code_check;
alter table public.messages add constraint messages_fallacy_code_check check (fallacy_code in (
    'HASTY_GENERALIZATION',
    'AD_HOMINEM',
    'STRAW_MAN',
    'SLIPPERY_SLOPE',
    'FALSE_DILEMMA',
    'BANDWAGON',
    'CONFIRMATION_BIAS',
    'HERD_MENTALITY',
    'SUNK_COST',
    'OVERCONFIDENCE_BIAS',
    'INGROUP_BIAS'
));
