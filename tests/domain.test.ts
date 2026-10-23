import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  financialSummary,
  shiftMonth,
  newEntry,
  Transaction,
  WorkProject,
  canSetProjectParent,
  projectAncestors,
  projectLabel,
} from '../lib/workspace';

test('hierarquia permite mover subprojetos, rejeita ciclos e mantém caminho dos ancestrais', () => {
  const root = { ...(newEntry('project') as WorkProject), title: 'Portal' };
  const child = {
    ...(newEntry('project') as WorkProject),
    title: 'Aplicativo',
    parentProjectId: root.id,
  };
  const grandchild = {
    ...(newEntry('project') as WorkProject),
    title: 'Pagamentos',
    parentProjectId: child.id,
  };
  const projects = [root, child, grandchild];
  assert.equal(canSetProjectParent(root.id, root.id, projects), false);
  assert.equal(canSetProjectParent(root.id, grandchild.id, projects), false);
  assert.equal(canSetProjectParent(child.id, grandchild.id, projects), false);
  assert.equal(canSetProjectParent(child.id, '', projects), true);
  assert.equal(canSetProjectParent(grandchild.id, root.id, projects), true);
  assert.equal(canSetProjectParent(root.id, 'missing', projects), false);
  assert.deepEqual(
    projectAncestors(grandchild, projects).map((p) => p.id),
    [root.id, child.id],
  );
  assert.equal(projectLabel(grandchild, projects), 'Portal / Aplicativo / Pagamentos');
  const corrupted = [{ ...root, parentProjectId: child.id }, child];
  assert.equal(canSetProjectParent('new-project', child.id, corrupted), false);
  assert(projectAncestors(child, corrupted).length <= corrupted.length);
});
test('saldo considera pagamentos, previsão inclui pendências e mantém precisão de centavos', () => {
  const transaction = (amount: number, type: 'income' | 'expense', paid: boolean) => ({
    ...(newEntry('transaction') as Transaction),
    amount,
    type,
    paid,
  });
  const summary = financialSummary([
    transaction(1000, 'income', true),
    transaction(500, 'income', false),
    transaction(100.1, 'expense', true),
    transaction(200.2, 'expense', false),
    transaction(0.1, 'expense', true),
    transaction(0.2, 'expense', true),
  ]);
  assert.equal(summary.balance, 899.6);
  assert.equal(summary.forecast, 1199.4);
  assert.equal(summary.receivable, 500);
  assert.equal(summary.payable, 200.2);
});
test('recorrências ajustam o vencimento ao último dia do mês e atravessam o ano', () => {
  assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28');
  assert.equal(shiftMonth('2028-01-31', 1), '2028-02-29');
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-31');
  assert.equal(shiftMonth('2026-03-31', -1), '2026-02-28');
});
