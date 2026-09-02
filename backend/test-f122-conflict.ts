import { detectDependencyConflicts } from "./src/utils/customCodeValidator.js";

function runTest() {
    console.log("Starting F-122 Custom Code Dependency Conflict Detection integration test...\n");

    // 1. JS/CSS Mismatch
    console.log("--- 1. Testing JS/CSS Mismatch ---");
    const mismatchList = [{
        id: "snip-mismatch",
        name: "Mismatch Snippet",
        code: "console.log('mismatch');",
        type: "javascript",
        placement: "head",
        conditions: [],
        environments: ["production"],
        dependencies: [
            { type: "javascript" as const, url: "https://example.com/style.css" },
            { type: "css" as const, url: "https://example.com/script.js" }
        ]
    }];
    const mismatches = detectDependencyConflicts(mismatchList);
    console.log("Mismatches found:", mismatches.map(m => m.message));
    if (mismatches.length !== 2 || mismatches[0].severity !== "warning" || mismatches[1].severity !== "warning") {
        throw new Error("FAILED: Should detect exactly 2 file mismatch warnings!");
    }
    console.log("✓ JS/CSS Mismatch checks PASSED.\n");

    // 2. Version Conflict
    console.log("--- 2. Testing Version Conflict ---");
    const versionConflictList = [
        {
            id: "snip-jquery3",
            name: "Snippet with jQuery 3.6.0",
            code: "console.log('jquery3');",
            type: "javascript",
            placement: "head",
            conditions: [],
            environments: ["production"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" }]
        },
        {
            id: "snip-jquery2",
            name: "Snippet with jQuery 2.2.4",
            code: "console.log('jquery2');",
            type: "javascript",
            placement: "head",
            conditions: [],
            environments: ["production"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js" }]
        }
    ];
    const verConflicts = detectDependencyConflicts(versionConflictList);
    console.log("Version conflicts found:", verConflicts.map(c => c.message));
    if (verConflicts.length !== 1 || verConflicts[0].severity !== "error") {
        throw new Error("FAILED: Incompatible jQuery versions (v3.6.0 vs v2.2.4) in active environment must trigger an error!");
    }
    console.log("✓ Version Conflict check PASSED.\n");

    // 3. Environment Isolation (Non-Conflict)
    console.log("--- 3. Testing Environment Isolation ---");
    const sameLibDifferentEnvs = [
        {
            id: "snip-dev",
            name: "Dev jQuery v3",
            code: "console.log('dev');",
            type: "javascript",
            placement: "head",
            conditions: [],
            environments: ["development"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" }]
        },
        {
            id: "snip-prod",
            name: "Prod jQuery v2",
            code: "console.log('prod');",
            type: "javascript",
            placement: "head",
            conditions: [],
            environments: ["production"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js" }]
        }
    ];
    const envConflicts = detectDependencyConflicts(sameLibDifferentEnvs);
    console.log("Conflicts across environment boundaries (expected 0):", envConflicts.length);
    if (envConflicts.length !== 0) {
        throw new Error("FAILED: Different versions in separate environments should NOT trigger version conflict!");
    }
    console.log("✓ Environment isolation check PASSED.\n");

    // 4. Mutually Exclusive Conditions Isolation (Non-Conflict)
    console.log("--- 4. Testing Mutually Exclusive Conditions Isolation ---");
    const mutuallyExclusiveList = [
        {
            id: "snip-mobile",
            name: "Mobile Snippet v3",
            code: "console.log('mobile');",
            type: "javascript",
            placement: "head",
            conditions: [{ type: "device", operator: "equals", value: "mobile" }],
            environments: ["production"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" }]
        },
        {
            id: "snip-desktop",
            name: "Desktop Snippet v2",
            code: "console.log('desktop');",
            type: "javascript",
            placement: "head",
            conditions: [{ type: "device", operator: "equals", value: "desktop" }],
            environments: ["production"],
            dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js" }]
        }
    ];
    const condConflicts = detectDependencyConflicts(mutuallyExclusiveList);
    console.log("Conflicts across mutually exclusive device conditions (expected 0):", condConflicts.length);
    if (condConflicts.length !== 0) {
        throw new Error("FAILED: Mutually exclusive conditions should block conflict verification triggers!");
    }
    console.log("✓ Mutually exclusive conditions check PASSED.\n");

    // 5. Missing Dependency
    console.log("--- 5. Testing Missing Dependency ---");
    const missingDependencyList = [{
        id: "snip-select2",
        name: "Snippet with Select2",
        code: "console.log('select2');",
        type: "javascript",
        placement: "head",
        conditions: [],
        environments: ["production"],
        dependencies: [{ type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js" }]
    }];
    const missingConflicts = detectDependencyConflicts(missingDependencyList);
    console.log("Missing dependency conflicts found:", missingConflicts.map(c => c.message));
    if (missingConflicts.length !== 1 || missingConflicts[0].severity !== "error" || missingConflicts[0].type !== "missing_dependency") {
        throw new Error("FAILED: Select2 must fail with a missing dependency error since jQuery is not registered!");
    }
    console.log("✓ Missing dependency check PASSED.\n");

    // 6. Ordering Conflict
    console.log("--- 6. Testing Ordering Conflict ---");
    const orderConflictList = [{
        id: "snip-bootstrap-first",
        name: "Snippet with bootstrap first",
        code: "console.log('libs');",
        type: "javascript",
        placement: "head",
        conditions: [],
        environments: ["production"],
        dependencies: [
            { type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js" },
            { type: "javascript" as const, url: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" }
        ]
    }];
    const orderConflicts = detectDependencyConflicts(orderConflictList);
    console.log("Order conflicts found:", orderConflicts.map(c => c.message));
    if (orderConflicts.length !== 1 || orderConflicts[0].severity !== "error" || orderConflicts[0].type !== "ordering_conflict") {
        throw new Error("FAILED: Select2 loading before jQuery must trigger an ordering conflict error!");
    }
    console.log("✓ Ordering Conflict check PASSED.\n");

    // 7. Circular Dependency
    console.log("--- 7. Testing Circular Dependency ---");
    const circularList = [{
        id: "snip-circular",
        name: "Circular Snippet",
        code: "console.log('cycle');",
        type: "javascript",
        placement: "head",
        conditions: [],
        environments: ["production"],
        dependencies: [
            { type: "javascript" as const, url: "https://example.com/libA.js", requires: "libB.js" },
            { type: "javascript" as const, url: "https://example.com/libB.js", requires: "libA.js" }
        ]
    }];
    const circConflicts = detectDependencyConflicts(circularList);
    console.log("Circular dependency conflicts found:", circConflicts.map(c => c.message));
    if (circConflicts.length !== 1 || circConflicts[0].severity !== "error" || circConflicts[0].type !== "circular_dependency") {
        throw new Error("FAILED: A -> B and B -> A relations must trigger a circular dependency error!");
    }
    console.log("✓ Circular Dependency check PASSED.\n");

    console.log("All F-122 Conflict Detection checks PASSED successfully!");
}

runTest();
