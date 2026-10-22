import fs from 'fs';
import path from 'path';

function verifySqlPatch() {
  const patchPath = path.resolve(process.cwd(), 'supabase/MELOMUS_ACTUALIZACION_SEGURIDAD.sql');
  const sql = fs.readFileSync(patchPath, 'utf8');

  console.log('======================================================================');
  console.log(' VERIFICACIÓN ESTÁTICA Y DE INTEGRIDAD: MELOMUS_ACTUALIZACION_SEGURIDAD.sql');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function check(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Transaccionalidad
  check('1. Empieza con BEGIN y termina con COMMIT', /^\s*begin;/im.test(sql) && /commit;\s*$/im.test(sql));

  // 2. No destructivo
  check('2. NO contiene DROP TABLE', !/drop\s+table/i.test(sql));
  check('3. NO contiene TRUNCATE', !/truncate/i.test(sql));
  check('4. NO contiene DELETE FROM sin where o destructivo de tablas', !/delete\s+from\s+(families|profiles|family_members)/i.test(sql));

  // 3. Tabla co_admin_invites: Permisos y Revocaciones
  check('5. Revoca INSERT, UPDATE, DELETE en co_admin_invites a authenticated, anon, public', 
    /revoke\s+insert,\s*update,\s*delete\s+on\s+co_admin_invites\s+from\s+authenticated,\s*anon,\s*public;/i.test(sql));
  check('6. Concede únicamente SELECT en co_admin_invites a authenticated',
    /grant\s+select\s+on\s+co_admin_invites\s+to\s+authenticated;/i.test(sql));

  // 4. Triggers instalados
  check('7. Trigger tr_protect_co_admin_invites instalado en co_admin_invites',
    /create\s+trigger\s+tr_protect_co_admin_invites\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+co_admin_invites/i.test(sql));
  check('8. Trigger tr_protect_profile_fields instalado en profiles',
    /create\s+trigger\s+tr_protect_profile_fields\s+before\s+update\s+on\s+profiles/i.test(sql));
  check('9. Trigger tr_protect_finance_expenses_created_by instalado',
    /create\s+trigger\s+tr_protect_finance_expenses_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+finances_expenses/i.test(sql));
  check('10. Trigger tr_protect_finance_incomes_created_by instalado',
    /create\s+trigger\s+tr_protect_finance_incomes_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+finances_incomes/i.test(sql));
  check('11. Trigger tr_protect_finance_bills_created_by instalado',
    /create\s+trigger\s+tr_protect_finance_bills_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+finances_bills/i.test(sql));
  check('12. Trigger tr_protect_finance_debts_created_by instalado',
    /create\s+trigger\s+tr_protect_finance_debts_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+finances_debts/i.test(sql));
  check('13. Trigger tr_protect_couple_created_by instalado',
    /create\s+trigger\s+tr_protect_couple_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+couple_records/i.test(sql));
  check('14. Trigger tr_protect_habits_created_by instalado',
    /create\s+trigger\s+tr_protect_habits_created_by\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+habits/i.test(sql));

  // 5. RPCs: SECURITY DEFINER, search_path seguro y permisos
  const rpcs = ['register_primary_adult', 'create_co_admin_invite', 'get_invite_details', 'claim_coadmin_link'];
  for (const rpc of rpcs) {
    const rpcRegex = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${rpc}[\\s\\S]*?security\\s+definer[\\s\\S]*?set\\s+search_path\\s*=\\s*public,\\s*auth,\\s*extensions`, 'i');
    check(`15. RPC ${rpc} declarada con SECURITY DEFINER y search_path seguro`, rpcRegex.test(sql));
  }

  // Permisos de las RPCs
  check('16. get_invite_details permitido a anon y authenticated',
    /grant\s+execute\s+on\s+function\s+get_invite_details\(text\)\s+to\s+anon,\s*authenticated;/i.test(sql));
  check('17. register_primary_adult revocado de anon y concedido a authenticated',
    /revoke\s+all\s+on\s+function\s+register_primary_adult[\s\S]*?grant\s+execute\s+on\s+function\s+register_primary_adult[\s\S]*?to\s+authenticated;/i.test(sql));
  check('18. create_co_admin_invite revocado de anon y concedido a authenticated',
    /revoke\s+all\s+on\s+function\s+create_co_admin_invite[\s\S]*?grant\s+execute\s+on\s+function\s+create_co_admin_invite[\s\S]*?to\s+authenticated;/i.test(sql));
  check('19. claim_coadmin_link revocado de anon y concedido a authenticated',
    /revoke\s+all\s+on\s+function\s+claim_coadmin_link[\s\S]*?grant\s+execute\s+on\s+function\s+claim_coadmin_link[\s\S]*?to\s+authenticated;/i.test(sql));

  // 6. Distinción explícita de reclamo vs revocación en el trigger
  check('20. Trigger distingue explícitamente Reclamo (new.used_by_user_id is not null) vs Revocación',
    sql.includes('CASO A: RECLAMO') && sql.includes('CASO B: REVOCACIÓN'));
  check('21. Trigger prohíbe auto-reclamo en CASO A',
    sql.includes("old.created_by_user_id = auth.uid() then\n          raise exception 'No puedes reclamar una invitación creada por ti mismo'"));
  check('22. Trigger valida autorización en CASO B (solo creador o coadmin de la misma familia)',
    sql.includes('No tienes permisos para revocar invitaciones de otra familia'));
  check('23. Trigger prohíbe transicionar una invitación ya usada o revocada',
    sql.includes("old.used_at is not null then\n        raise exception 'Esta invitación ya fue utilizada o revocada anteriormente'"));

  // 7. Limpieza de políticas permisivas residuales
  check('24. Limpia políticas residuales de co_admin_invites (manage, all)',
    sql.includes('drop policy if exists "co_admin_invites_manage_family"') && sql.includes('drop policy if exists "co_admin_invites_all"'));
  check('25. Limpia políticas residuales de finances (manage, all)',
    sql.includes('drop policy if exists "finances_expenses_manage"') && sql.includes('drop policy if exists "finances_expenses_all"'));
  check('26. Limpia políticas residuales de couple_records (manage, all)',
    sql.includes('drop policy if exists "couple_records_manage"') && sql.includes('drop policy if exists "couple_records_all"'));
  check('27. Limpia políticas residuales de habits (manage, all)',
    sql.includes('drop policy if exists "habits_manage"') && sql.includes('drop policy if exists "habits_all"'));

  console.log('\n======================================================================');
  console.log(` RESULTADO VERIFICACIÓN SQL: ${passed} PASARON, ${failed} FALLARON`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifySqlPatch();
