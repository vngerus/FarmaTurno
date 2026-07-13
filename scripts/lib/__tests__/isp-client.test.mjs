import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractHiddenFields, parseResultRows } from '../isp-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load HTML fixtures
const initialHtml = readFileSync(join(__dirname, 'fixtures', 'isp-paso1-inicial.html'), 'utf-8');
const resultsHtml = readFileSync(join(__dirname, 'fixtures', 'isp-paso3-resultados.html'), 'utf-8');

test('extractHiddenFields extracts __VIEWSTATE, __VIEWSTATEGENERATOR, and __EVENTVALIDATION from initial page', () => {
  const fields = extractHiddenFields(initialHtml);

  assert.strictEqual(typeof fields.viewState, 'string', 'viewState should be a string');
  assert.strictEqual(typeof fields.viewStateGenerator, 'string', 'viewStateGenerator should be a string');
  assert.strictEqual(typeof fields.eventValidation, 'string', 'eventValidation should be a string');

  assert.strictEqual(fields.viewState, 'dGhpcyBpcyBhIGZha2Ugdmlld3N0YXRlIHZhbHVlIGZvciBUZXN0aW5nIFZhbHVl', 'viewState value mismatch');
  assert.strictEqual(fields.viewStateGenerator, 'CA0B0334', 'viewStateGenerator value mismatch');
  assert.strictEqual(fields.eventValidation, 'dGhpcyBpcyBhIGZha2UgZXZlbnQgdmFsaWRhdGlvbiB2YWx1ZSBmb3IgVGVzdGluZ1B1cnBvc2VzIHdpdGggYWRkaXRpb25hbCBkYXRh', 'eventValidation value mismatch');
});

test('parseResultRows extracts all product rows from results table', () => {
  const rows = parseResultRows(resultsHtml);

  assert.strictEqual(rows.length, 2, 'should find exactly 2 rows');

  // First row
  assert.strictEqual(rows[0].registroIsp, 'F-26557/21', 'first row registroIsp mismatch');
  assert.strictEqual(rows[0].nombreProducto, 'ALIVIDOL COMPRIMIDOS 500 mg', 'first row nombreProducto mismatch');
  assert.strictEqual(rows[0].fechaRegistro, '2021-12-30', 'first row fechaRegistro mismatch');
  assert.strictEqual(rows[0].empresa, 'OPKO CHILE S.A.', 'first row empresa mismatch');
  assert.strictEqual(rows[0].principioActivo, 'PARACETAMOL', 'first row principioActivo mismatch');

  // Second row
  assert.strictEqual(rows[1].registroIsp, 'F-45123/22', 'second row registroIsp mismatch');
  assert.strictEqual(rows[1].nombreProducto, 'TAFIROL COMPRIMIDOS 500 mg', 'second row nombreProducto mismatch');
  assert.strictEqual(rows[1].fechaRegistro, '2022-03-15', 'second row fechaRegistro mismatch');
  assert.strictEqual(rows[1].empresa, 'COSME FARM S.A.', 'second row empresa mismatch');
  assert.strictEqual(rows[1].principioActivo, 'PARACETAMOL', 'second row principioActivo mismatch');
});

test('parseResultRows returns empty array when table is missing', () => {
  const emptyHtml = '<html><body><p>No results found</p></body></html>';
  const rows = parseResultRows(emptyHtml);

  assert.strictEqual(Array.isArray(rows), true, 'should return an array');
  assert.strictEqual(rows.length, 0, 'should return empty array when table is missing');
});
