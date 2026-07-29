import assert from "node:assert/strict";
import { parseSuppliersListQuery } from "../../app/api/app/suppliers/query.ts";

const productiveRequest = new URL("https://www.opturon.test/api/app/suppliers?pageSize=100&sort=name_asc");
const productiveQuery = parseSuppliersListQuery(productiveRequest.searchParams);
assert.equal(productiveQuery.ok, true);
if (productiveQuery.ok) {
  assert.deepEqual(productiveQuery.options, {
    search: undefined,
    status: undefined,
    page: 1,
    pageSize: 100,
    sort: "name_asc"
  });
}

const invalidPageSize = parseSuppliersListQuery(new URL("https://www.opturon.test/api/app/suppliers?pageSize=abc").searchParams);
assert.deepEqual(invalidPageSize, { ok: false, error: "invalid_page_size" });

const invalidSort = parseSuppliersListQuery(new URL("https://www.opturon.test/api/app/suppliers?sort=name_up").searchParams);
assert.deepEqual(invalidSort, { ok: false, error: "invalid_sort" });

const invalidStatus = parseSuppliersListQuery(new URL("https://www.opturon.test/api/app/suppliers?status=Activo").searchParams);
assert.deepEqual(invalidStatus, { ok: false, error: "invalid_status" });

console.log("suppliers-list-request-http500.test.ts passed");
