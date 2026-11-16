# Knowledge functional journey

Build Echo first. Start with `ECHO_REPO=<Echo checkout> bash tests/fixtures/knowledge/up.sh <new test directory> <free port>`; stop with `bash tests/fixtures/knowledge/down.sh <directory>`.

Run TC-001, TC-002 then TC-003 as one journey against that installed package. All CLI steps source `<directory>/env`; only this test data may be read or changed. `knowledge-fixture.json` names the synthetic vault/profile. The fixture reuses Echo's stream-protocol fake and never starts real Claude or reaches a model account.

Every profile in this fixture, including Claude Code (as configured), uses the fake executable. The default profile
and `plugin-test` both need response scripts; TC-002 verifies that each answers and clearly identifies its reply as
simulated. Do not connect personal vaults or treat this window as a real-Claude environment.

Besides the normal Echo case tools, these cases may inspect/change synthetic vault files and fake response files, and enable/disable/remove/reinstall this package through the test environment's CLI. When testing ingest, `ingest.jsonl` waits on `<profile>/go.1`; write the absolute scratch destination from `<profile>/ingest.cwd` to `<profile>/apply.1.to` then create `go.1`. This releases one proposed page write in the scratch copy. All source and finding words are made up.

Native window smoke testing runs `echoctl app run` with a separate synthetic environment and opens its window;
`--no-tray` omits the UI event loop and cannot show a native window. Never stop/restart the user's installed app.
Real signed-in AI/Microsoft 365, real calls and native Windows remain person checks.

TC-004 records the remaining native desktop and connected-account checks separately. The synthetic fixture uses debug
picker stand-ins and a fake `curl` which serves only `https://acme.example/knowledge`; it never fetches a real website.
For hot-update checks, change only the staged package under `<directory>/market`, then update/reinstall it through
Echo. Keep the source checkout unchanged during the functional journey.
