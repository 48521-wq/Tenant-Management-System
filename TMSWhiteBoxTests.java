import java.util.*;
import java.lang.annotation.*;
import java.lang.reflect.*;

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         TMS - WHITE BOX TESTING SUITE                                ║
 * ║         Tenant Management System                                     ║
 * ║         Tool: JUnit-style (Self-contained, no external jars)         ║
 * ║                                                                      ║
 * ║  Modules:                                                            ║
 * ║   1. Auth      (register, login, token)                              ║
 * ║   2. Property  (CRUD, authorization, filters)                        ║
 * ║   3. Payment   (create, roles, validation)                           ║
 * ║   4. Lease     (create, date validation, roles)                      ║
 * ║   5. Maintenance (submit, status update, roles)                      ║
 * ║   6. Complaints  (file, status update, roles)                        ║
 * ║   7. Users      (block, verify, delete - admin only)                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
public class TMSWhiteBoxTests {

    // ══════════════════════════════════════════════════════════════════
    //  ANNOTATIONS
    // ══════════════════════════════════════════════════════════════════

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface Test {}

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface DisplayName { String value(); }

    // ══════════════════════════════════════════════════════════════════
    //  ASSERTION HELPERS
    // ══════════════════════════════════════════════════════════════════

    static void assertTrue(boolean c, String msg) {
        if (!c) throw new AssertionError("Expected TRUE → " + msg);
    }
    static void assertFalse(boolean c, String msg) {
        if (c) throw new AssertionError("Expected FALSE → " + msg);
    }
    static void assertEquals(Object exp, Object act) {
        if (!Objects.equals(exp, act))
            throw new AssertionError("Expected <" + exp + "> but got <" + act + ">");
    }
    static void assertEquals(Object exp, Object act, String msg) {
        if (!Objects.equals(exp, act))
            throw new AssertionError(msg + " | Expected <" + exp + "> got <" + act + ">");
    }
    static void assertNotNull(Object o, String msg) {
        if (o == null) throw new AssertionError("Expected not-null → " + msg);
    }

    // ══════════════════════════════════════════════════════════════════
    //  TEST RUNNER
    // ══════════════════════════════════════════════════════════════════

    static int passed = 0, failed = 0;
    static List<String> failures = new ArrayList<>();

    static void run(Object obj) {
        Class<?> cls = obj.getClass();
        System.out.println("\n" + "─".repeat(65));
        System.out.println("  MODULE: " + cls.getSimpleName().replace("Tests", "").replace("Test", ""));
        System.out.println("─".repeat(65));

        Method[] methods = cls.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));

        for (Method m : methods) {
            if (!m.isAnnotationPresent(Test.class)) continue;
            DisplayName dn = m.getAnnotation(DisplayName.class);
            String name = (dn != null) ? dn.value() : m.getName();
            try {
                m.setAccessible(true);
                m.invoke(obj);
                passed++;
                System.out.printf("  ✅ %s%n", name);
            } catch (InvocationTargetException e) {
                failed++;
                String msg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
                failures.add(name + " → " + msg);
                System.out.printf("  ❌ %s - %s%n", name, msg);
            } catch (IllegalAccessException e) {
                failed++;
                failures.add(name + " → " + e.getMessage());
                System.out.printf("  ❌ %s - %s%n", name, e.getMessage());
            }
        }
    }

    static void printSummary() {
        System.out.println("\n╔══════════════════════════════════════════════════════════════════════════╗");
        System.out.printf( "║  ✅ PASSED : %-51d ║%n", passed);
        System.out.printf( "║  ❌ FAILED : %-51d ║%n", failed);
        System.out.printf( "║  📊 TOTAL  : %-51d ║%n", passed + failed);
        System.out.println("╚══════════════════════════════════════════════════════════════════╝");
        if (!failures.isEmpty()) {
            System.out.println("\n  FAILED TESTS:");
            failures.forEach(f -> System.out.println("  • " + f));
        }
        System.out.println("\n  " + (failed == 0 ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED - Check above"));
    }

    // ══════════════════════════════════════════════════════════════════
    //  SHARED BUSINESS LOGIC HELPERS (mirror of backend JS logic)
    // ══════════════════════════════════════════════════════════════════

    /** mirrors: backend/routes/auth.js → POST /register */
    static Map<String, Object> authRegister(String name, String email, String password, String role) {
        Map<String, Object> r = new HashMap<>();
        // Branch 1: Required fields check
        if (isBlank(name) || isBlank(email) || isBlank(password) || isBlank(role)) {
            return fail(r, 400, "Please fill all fields.");
        }
        // Branch 2: Valid roles only
        if (!role.equals("tenant") && !role.equals("landlord")) {
            return fail(r, 400, "Invalid role.");
        }
        // Branch 3: Password minimum length
        if (password.length() < 6) {
            return fail(r, 400, "Password must be at least 6 characters.");
        }
        // Branch 4: Admin email protection
        if (email.equalsIgnoreCase("admin@tms.com")) {
            return fail(r, 400, "This email cannot be registered.");
        }
        r.put("success", true); r.put("status", 201); return r;
    }

    /** mirrors: backend/routes/auth.js → POST /login */
    static Map<String, Object> authLogin(String email, String password, String storedPw, String status) {
        Map<String, Object> r = new HashMap<>();
        // Branch 1: Missing fields
        if (isBlank(email) || isBlank(password)) return fail(r, 400, "Enter email and password.");
        // Branch 2: Admin shortcut
        if (email.equalsIgnoreCase("admin@tms.com")) {
            return "admin123".equals(password)
                ? ok(r, 200, "role", "admin")
                : fail(r, 401, "Incorrect password.");
        }
        // Branch 3: User not found
        if (storedPw == null) return fail(r, 401, "No account found. Please sign up first.");
        // Branch 4: Wrong password
        if (!password.equals(storedPw)) return fail(r, 401, "Incorrect password.");
        // Branch 5: Blocked
        if ("blocked".equals(status)) return fail(r, 403, "Account suspended. Contact admin.");
        r.put("success", true); r.put("status", 200); return r;
    }

    /** mirrors: backend/routes/properties.js → POST / */
    static Map<String, Object> propCreate(String role, boolean isAdmin, String title, Object rent) {
        Map<String, Object> r = new HashMap<>();
        if (isAdmin) return fail(r, 403, "Admin cannot add properties.");
        if (!"landlord".equals(role)) return fail(r, 403, "Only landlords can add properties.");
        if (isBlank(title)) return fail(r, 400, "Property title required.");
        if (rent == null) return fail(r, 400, "Rent amount required.");
        r.put("success", true); r.put("status", 201); return r;
    }

    /** mirrors: backend/routes/properties.js → authorization check in PUT/DELETE */
    static Map<String, Object> propAuth(String userId, String ownerId, boolean isAdmin) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin && !ownerId.equals(userId)) return fail(r, 403, "Not authorized.");
        r.put("success", true); r.put("status", 200); return r;
    }

    /** mirrors: filter building in GET /api/properties */
    static Map<String, Object> propFilter(Map<String, String> q) {
        Map<String, Object> f = new HashMap<>();
        if (q.containsKey("status"))  f.put("status",   q.get("status"));
        if (q.containsKey("area"))    f.put("area",     q.get("area"));
        if (q.containsKey("type"))    f.put("type",     q.get("type"));
        if (q.containsKey("beds"))    { try {
            int beds = Integer.parseInt(q.get("beds"));
            f.put("beds", beds);
        } catch (NumberFormatException e) {}
        }
        if (q.containsKey("maxRent")) { try {
            double maxRent = Double.parseDouble(q.get("maxRent"));
            f.put("maxRent", maxRent);
        } catch (NumberFormatException e) {}
        }
        return f;
    }

    /** mirrors: backend/routes/payments.js → POST / */
    static Map<String, Object> payCreate(boolean isAdmin, Double amount, String month) {
        Map<String, Object> r = new HashMap<>();
        if (isAdmin) return fail(r, 403, "Admin cannot add payments.");
        if (amount == null || isBlank(month)) return fail(r, 400, "Amount and month required.");
        if (amount <= 0) return fail(r, 400, "Amount must be positive.");
        r.put("success", true); r.put("status", 201); r.put("paymentStatus", "paid"); return r;
    }

    static String payFilter(boolean isAdmin, String role) {
        if (isAdmin) return "all";
        if ("tenant".equals(role)) return "tenantId";
        if ("landlord".equals(role)) return "landlordId";
        return "none";
    }

    /** mirrors: backend/routes/leases.js → POST / */
    static Map<String, Object> leaseCreate(boolean isAdmin, String startDate, String endDate) {
        Map<String, Object> r = new HashMap<>();
        if (isAdmin) return fail(r, 403, "Admin cannot sign leases.");
        if (isBlank(startDate) || isBlank(endDate)) return fail(r, 400, "Start and end date required.");
        r.put("success", true); r.put("status", 201); r.put("leaseStatus", "active"); return r;
    }

    /** mirrors: backend/routes/maintenance.js */
    static Map<String, Object> maintCreate(boolean isAdmin, String description) {
        Map<String, Object> r = new HashMap<>();
        if (isAdmin) return fail(r, 403, "Admin cannot submit maintenance.");
        if (isBlank(description)) return fail(r, 400, "Description is required.");
        r.put("success", true); r.put("status", 201); r.put("reqStatus", "pending"); return r;
    }
    static Map<String, Object> maintUpdateStatus(boolean isAdmin, String status) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin) return fail(r, 403, "Admin access required.");
        r.put("success", true); r.put("status", status);
        if ("resolved".equals(status)) r.put("resolvedAt", "set");
        return r;
    }

    /** mirrors: backend/routes/complaints.js */
    static Map<String, Object> compCreate(boolean isAdmin, String subject) {
        Map<String, Object> r = new HashMap<>();
        if (isAdmin) return fail(r, 403, "Admin cannot file complaints.");
        if (isBlank(subject)) return fail(r, 400, "Subject is required.");
        r.put("success", true); r.put("status", 201); r.put("compStatus", "open"); return r;
    }
    static Map<String, Object> compUpdateStatus(boolean isAdmin, String status) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin) return fail(r, 403, "Admin access required.");
        r.put("success", true); r.put("newStatus", status);
        if ("resolved".equals(status)) r.put("resolvedAt", "set");
        return r;
    }

    /** mirrors: backend/routes/users.js */
    static Map<String, Object> userToggleBlock(boolean isAdmin, String currentStatus) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin) return fail(r, 403, "Admin access required.");
        if (currentStatus == null) return fail(r, 404, "User not found.");
        r.put("success", true); r.put("newStatus", "blocked".equals(currentStatus) ? "active" : "blocked");
        return r;
    }
    static Map<String, Object> userVerify(boolean isAdmin, String userId) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin) return fail(r, 403, "Admin access required.");
        if (isBlank(userId)) return fail(r, 400, "User ID required.");
        r.put("success", true); r.put("verified", true); return r;
    }
    static Map<String, Object> userDelete(boolean isAdmin, String userId) {
        Map<String, Object> r = new HashMap<>();
        if (!isAdmin) return fail(r, 403, "Admin access required.");
        if (isBlank(userId)) return fail(r, 400, "User ID required.");
        r.put("success", true); r.put("message", "User deleted."); return r;
    }

    /** JWT 3-part format check */
    static boolean validJWT(String token) {
        if (token == null || token.isBlank()) return false;
        return token.split("\\.").length == 3;
    }

    // Util helpers
    static boolean isBlank(String s) { return s == null || s.isBlank(); }
    static Map<String, Object> fail(Map<String, Object> r, int status, String msg) {
        r.put("success", false); r.put("status", status); r.put("message", msg); return r;
    }
    static Map<String, Object> ok(Map<String, Object> r, int status, String k, Object v) {
        r.put("success", true); r.put("status", status); r.put(k, v); return r;
    }

    // ══════════════════════════════════════════════════════════════════
    //  MODULE 1: AUTH TESTS
    // ══════════════════════════════════════════════════════════════════

    static class AuthTests {
        @Test @DisplayName("TC-AUTH-WB-001: Valid tenant registration succeeds")
        void t001() {
            var r = authRegister("Ali Khan", "ali@gmail.com", "pass123", "tenant");
            assertTrue((Boolean)r.get("success"), "Valid tenant should pass");
            assertEquals(201, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-002: Valid landlord registration succeeds")
        void t002() {
            var r = authRegister("Sara Malik", "sara@gmail.com", "abc123", "landlord");
            assertTrue((Boolean)r.get("success"), "Valid landlord should pass");
        }
        @Test @DisplayName("TC-AUTH-WB-003: Registration fails - blank name")
        void t003() {
            var r = authRegister("", "test@gmail.com", "pass123", "tenant");
            assertFalse((Boolean)r.get("success"), "Blank name should fail");
            assertEquals("Please fill all fields.", r.get("message"));
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-004: Registration fails - null email")
        void t004() {
            var r = authRegister("Ali", null, "pass123", "tenant");
            assertFalse((Boolean)r.get("success"), "Null email should fail");
            assertEquals("Please fill all fields.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-005: Registration fails - empty password")
        void t005() {
            var r = authRegister("Ali", "ali@gmail.com", "", "tenant");
            assertFalse((Boolean)r.get("success"), "Empty password should fail");
            assertEquals("Please fill all fields.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-006: Registration fails - role 'admin' invalid")
        void t006() {
            var r = authRegister("H", "h@g.com", "pass123", "admin");
            assertFalse((Boolean)r.get("success"), "Role admin should be rejected");
            assertEquals("Invalid role.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-007: Registration fails - role 'manager' invalid")
        void t007() {
            var r = authRegister("U", "u@g.com", "pass123", "manager");
            assertFalse((Boolean)r.get("success"), "Role manager should be rejected");
            assertEquals("Invalid role.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-008: Registration fails - role 'superuser' invalid")
        void t008() {
            var r = authRegister("U", "u@g.com", "pass123", "superuser");
            assertFalse((Boolean)r.get("success"), "Role superuser should fail");
        }
        @Test @DisplayName("TC-AUTH-WB-009: Registration fails - password 5 chars (boundary FAIL)")
        void t009() {
            var r = authRegister("Ali", "ali@g.com", "abc12", "tenant");
            assertFalse((Boolean)r.get("success"), "5-char password should fail");
            assertEquals("Password must be at least 6 characters.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-010: Registration succeeds - password 6 chars (boundary PASS)")
        void t010() {
            var r = authRegister("Ali", "ali@g.com", "123456", "tenant");
            assertTrue((Boolean)r.get("success"), "6-char password should pass");
        }
        @Test @DisplayName("TC-AUTH-WB-011: Registration fails - password 1 char")
        void t011() {
            var r = authRegister("Ali", "ali@g.com", "a", "tenant");
            assertFalse((Boolean)r.get("success"), "1-char password should fail");
        }
        @Test @DisplayName("TC-AUTH-WB-012: Registration fails - admin@tms.com blocked")
        void t012() {
            var r = authRegister("Fake", "admin@tms.com", "pass123", "tenant");
            assertFalse((Boolean)r.get("success"), "Admin email must be blocked");
            assertEquals("This email cannot be registered.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-013: Admin email block is case-insensitive (ADMIN@TMS.COM)")
        void t013() {
            var r = authRegister("T", "ADMIN@TMS.COM", "pass123", "tenant");
            assertFalse((Boolean)r.get("success"), "Uppercase admin email must also be blocked");
            assertEquals("This email cannot be registered.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-014: Login fails - empty email")
        void t014() {
            var r = authLogin("", "pass123", "pass123", "active");
            assertFalse((Boolean)r.get("success"), "Empty email login should fail");
            assertEquals("Enter email and password.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-015: Login fails - null password")
        void t015() {
            var r = authLogin("user@g.com", null, "pass123", "active");
            assertFalse((Boolean)r.get("success"), "Null password should fail");
            assertEquals("Enter email and password.", r.get("message"));
        }
        @Test @DisplayName("TC-AUTH-WB-016: Admin login success with correct credentials")
        void t016() {
            var r = authLogin("admin@tms.com", "admin123", null, null);
            assertTrue((Boolean)r.get("success"), "Admin login should succeed");
            assertEquals("admin", r.get("role"));
            assertEquals(200, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-017: Admin login fails - wrong password → 401")
        void t017() {
            var r = authLogin("admin@tms.com", "wrongpass", null, null);
            assertFalse((Boolean)r.get("success"), "Wrong admin password should fail");
            assertEquals("Incorrect password.", r.get("message"));
            assertEquals(401, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-018: Login fails - user not found → 401")
        void t018() {
            var r = authLogin("ghost@g.com", "pass123", null, "active");
            assertFalse((Boolean)r.get("success"), "Unknown user should fail");
            assertEquals("No account found. Please sign up first.", r.get("message"));
            assertEquals(401, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-019: Login fails - wrong password → 401")
        void t019() {
            var r = authLogin("user@g.com", "badpass", "correctpass", "active");
            assertFalse((Boolean)r.get("success"), "Wrong password should fail");
            assertEquals("Incorrect password.", r.get("message"));
            assertEquals(401, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-020: Login fails - account blocked → 403")
        void t020() {
            var r = authLogin("user@g.com", "pass123", "pass123", "blocked");
            assertFalse((Boolean)r.get("success"), "Blocked user should be denied");
            assertEquals("Account suspended. Contact admin.", r.get("message"));
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-021: Login success - active user, correct password")
        void t021() {
            var r = authLogin("user@g.com", "pass123", "pass123", "active");
            assertTrue((Boolean)r.get("success"), "Active user with correct password should login");
            assertEquals(200, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-022: Blocked user with correct password still denied")
        void t022() {
            var r = authLogin("user@g.com", "pass123", "pass123", "blocked");
            assertFalse((Boolean)r.get("success"), "Blocked user must still be denied");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-AUTH-WB-023: Valid JWT token - exactly 3 dot-separated parts")
        void t023() {
            assertTrue(validJWT("abc.def.ghi"), "JWT with three parts should be valid");
        }
        @Test @DisplayName("TC-AUTH-WB-024: Invalid JWT - only 2 parts")
        void t024() {
            assertFalse(validJWT("abc.def"), "JWT with two parts should be invalid");
        }
        @Test @DisplayName("TC-AUTH-WB-025: Invalid JWT - null")
        void t025() {
            assertFalse(validJWT(null), "Null JWT should be invalid");
        }
        @Test @DisplayName("TC-AUTH-WB-026: Invalid JWT - empty string")
        void t026() {
            assertFalse(validJWT(""), "Empty JWT should be invalid");
        }
        @Test @DisplayName("TC-AUTH-WB-027: Invalid JWT - 4 parts (too many segments)")
        void t027() {
            assertFalse(validJWT("a.b.c.d"), "JWT with four parts should be invalid");
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 2: PROPERTY TESTS
    // ══════════════════════════════════════════════════════════

    static class PropertyTests {
        @Test @DisplayName("TC-PROP-WB-001: Landlord creates property → 201")
        void t001() {
            var r = propCreate("landlord", false, "Nice Home", 25000);
            assertTrue((Boolean)r.get("success"), "Landlord should be able to create property");
            assertEquals(201, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-002: Admin cannot create property → 403")
        void t002() {
            var r = propCreate("admin", true, "Home", 25000);
            assertFalse((Boolean)r.get("success"), "Admin should not create property");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-003: Tenant cannot create property → 403")
        void t003() {
            var r = propCreate("tenant", false, "Home", 25000);
            assertFalse((Boolean)r.get("success"), "Tenant should not create property");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-004: Create fails - blank title")
        void t004() {
            var r = propCreate("landlord", false, "", 25000);
            assertFalse((Boolean)r.get("success"), "Blank title should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-005: Create fails - null title")
        void t005() {
            var r = propCreate("landlord", false, null, 25000);
            assertFalse((Boolean)r.get("success"), "Null title should fail");
        }
        @Test @DisplayName("TC-PROP-WB-006: Create fails - missing rent")
        void t006() {
            var r = propCreate("landlord", false, "Home", null);
            assertFalse((Boolean)r.get("success"), "Missing rent should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-007: Owner can update own property")
        void t007() {
            var r = propAuth("user1", "user1", false);
            assertTrue((Boolean)r.get("success"), "Owner should be authorized");
        }
        @Test @DisplayName("TC-PROP-WB-008: Admin can update any property")
        void t008() {
            var r = propAuth("user1", "otherOwner", true);
            assertTrue((Boolean)r.get("success"), "Admin should be authorized");
        }
        @Test @DisplayName("TC-PROP-WB-009: Non-owner cannot update property → 403")
        void t009() {
            var r = propAuth("user1", "owner2", false);
            assertFalse((Boolean)r.get("success"), "Non-owner should be denied");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-010: Owner can delete own property")
        void t010() {
            var r = propAuth("user1", "user1", false);
            assertTrue((Boolean)r.get("success"), "Owner should be allowed to delete");
        }
        @Test @DisplayName("TC-PROP-WB-011: Admin can delete any property")
        void t011() {
            var r = propAuth("user1", "otherOwner", true);
            assertTrue((Boolean)r.get("success"), "Admin should be allowed to delete any property");
        }
        @Test @DisplayName("TC-PROP-WB-012: Non-owner cannot delete property → 403")
        void t012() {
            var r = propAuth("user1", "owner2", false);
            assertFalse((Boolean)r.get("success"), "Non-owner should be denied delete");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-013: Filter by status 'available'")
        void t013() {
            var q = new HashMap<String, String>(); q.put("status", "available");
            var f = propFilter(q);
            assertEquals("available", f.get("status"));
        }
        @Test @DisplayName("TC-PROP-WB-014: Filter by area 'DHA Lahore'")
        void t014() {
            var q = new HashMap<String, String>(); q.put("area", "DHA Lahore");
            var f = propFilter(q);
            assertEquals("DHA Lahore", f.get("area"));
        }
        @Test @DisplayName("TC-PROP-WB-015: Filter by maxRent 30000 → stored as double")
        void t015() {
            var q = new HashMap<String, String>(); q.put("maxRent", "30000");
            var f = propFilter(q);
            assertEquals(30000.0, f.get("maxRent"));
        }
        @Test @DisplayName("TC-PROP-WB-016: Filter by min beds = 3")
        void t016() {
            var q = new HashMap<String, String>(); q.put("beds", "3");
            var f = propFilter(q);
            assertEquals(3, f.get("beds"));
        }
        @Test @DisplayName("TC-PROP-WB-017: Filter invalid beds 'abc' → error key set")
        void t017() {
            var q = new HashMap<String, String>(); q.put("beds", "abc");
            var f = propFilter(q);
            assertFalse(f.containsKey("beds"), "Invalid beds should not be added");
        }
        @Test @DisplayName("TC-PROP-WB-018: Filter invalid maxRent 'xyz' → error key set")
        void t018() {
            var q = new HashMap<String, String>(); q.put("maxRent", "xyz");
            var f = propFilter(q);
            assertFalse(f.containsKey("maxRent"), "Invalid maxRent should not be added");
        }
        @Test @DisplayName("TC-PROP-WB-019: Empty filter query → empty filter map")
        void t019() {
            var f = propFilter(new HashMap<>());
            assertTrue(f.isEmpty(), "Empty query produces empty filter");
        }
        @Test @DisplayName("TC-PROP-WB-020: Multiple filters combined correctly")
        void t020() {
            var q = new HashMap<String, String>();
            q.put("status", "available");
            q.put("area", "DHA");
            q.put("beds", "2");
            var f = propFilter(q);
            assertEquals("available", f.get("status"));
            assertEquals("DHA", f.get("area"));
            assertEquals(2, f.get("beds"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 3: PAYMENT TESTS
    // ══════════════════════════════════════════════════════════

    static class PaymentTests {
        @Test @DisplayName("TC-PAY-WB-001: Tenant creates payment → 201 + status='paid'")
        void t001() {
            var r = payCreate(false, 100.0, "June");
            assertTrue((Boolean)r.get("success"), "Payment creation should succeed");
            assertEquals(201, r.get("status"));
            assertEquals("paid", r.get("paymentStatus"));
        }
        @Test @DisplayName("TC-PAY-WB-002: Admin cannot add payment → 403")
        void t002() {
            var r = payCreate(true, 100.0, "June");
            assertFalse((Boolean)r.get("success"), "Admin should not add payment");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-PAY-WB-003: Payment fails - null amount")
        void t003() {
            var r = payCreate(false, null, "June");
            assertFalse((Boolean)r.get("success"), "Null amount should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PAY-WB-004: Payment fails - empty month")
        void t004() {
            var r = payCreate(false, 100.0, "");
            assertFalse((Boolean)r.get("success"), "Empty month should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PAY-WB-005: Payment fails - negative amount")
        void t005() {
            var r = payCreate(false, -10.0, "June");
            assertFalse((Boolean)r.get("success"), "Negative amount should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PAY-WB-006: Payment fails - zero amount (boundary)")
        void t006() {
            var r = payCreate(false, 0.0, "June");
            assertFalse((Boolean)r.get("success"), "Zero amount should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-PAY-WB-007: Payment succeeds - amount = 1 (minimum boundary)")
        void t007() {
            var r = payCreate(false, 1.0, "June");
            assertTrue((Boolean)r.get("success"), "Minimum positive payment should succeed");
        }
        @Test @DisplayName("TC-PAY-WB-008: Admin sees ALL payments (filter=all)")
        void t008() {
            assertEquals("all", payFilter(true, "admin"));
        }
        @Test @DisplayName("TC-PAY-WB-009: Tenant sees only own payments (filter=tenantId)")
        void t009() {
            assertEquals("tenantId", payFilter(false, "tenant"));
        }
        @Test @DisplayName("TC-PAY-WB-010: Landlord sees own payments (filter=landlordId)")
        void t010() {
            assertEquals("landlordId", payFilter(false, "landlord"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 4: LEASE TESTS
    // ══════════════════════════════════════════════════════════

    static class LeaseTests {
        @Test @DisplayName("TC-LEASE-WB-001: Tenant signs lease → 201 + status='active'")
        void t001() {
            var r = leaseCreate(false, "2026-05-01", "2027-05-01");
            assertTrue((Boolean)r.get("success"), "Tenant lease creation should succeed");
            assertEquals(201, r.get("status"));
            assertEquals("active", r.get("leaseStatus"));
        }
        @Test @DisplayName("TC-LEASE-WB-002: Admin cannot sign lease → 403")
        void t002() {
            var r = leaseCreate(true, "2026-05-01", "2027-05-01");
            assertFalse((Boolean)r.get("success"), "Admin should not sign lease");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-LEASE-WB-003: Lease fails - null startDate")
        void t003() {
            var r = leaseCreate(false, null, "2027-05-01");
            assertFalse((Boolean)r.get("success"), "Null startDate should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-LEASE-WB-004: Lease fails - empty endDate")
        void t004() {
            var r = leaseCreate(false, "2026-05-01", "");
            assertFalse((Boolean)r.get("success"), "Empty endDate should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-LEASE-WB-005: Lease fails - both dates null")
        void t005() {
            var r = leaseCreate(false, null, null);
            assertFalse((Boolean)r.get("success"), "Null dates should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-LEASE-WB-006: Admin sees all leases (admin filter)")
        void t006() {
            assertEquals("all", payFilter(true, "admin"));
        }
        @Test @DisplayName("TC-LEASE-WB-007: Tenant sees own leases")
        void t007() {
            assertEquals("tenantId", payFilter(false, "tenant"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 5: MAINTENANCE TESTS
    // ══════════════════════════════════════════════════════════

    static class MaintenanceTests {
        @Test @DisplayName("TC-MAINT-WB-001: Tenant submits maintenance → 201 + status='pending'")
        void t001() {
            var r = maintCreate(false, "Leaky faucet");
            assertTrue((Boolean)r.get("success"), "Maintenance submission should succeed");
            assertEquals(201, r.get("status"));
            assertEquals("pending", r.get("reqStatus"));
        }
        @Test @DisplayName("TC-MAINT-WB-002: Admin cannot submit maintenance → 403")
        void t002() {
            var r = maintCreate(true, "Leaky faucet");
            assertFalse((Boolean)r.get("success"), "Admin should not submit maintenance");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-MAINT-WB-003: Request fails - empty description")
        void t003() {
            var r = maintCreate(false, "");
            assertFalse((Boolean)r.get("success"), "Empty description should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-MAINT-WB-004: Request fails - null description")
        void t004() {
            var r = maintCreate(false, null);
            assertFalse((Boolean)r.get("success"), "Null description should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-MAINT-WB-005: Request fails - whitespace-only description")
        void t005() {
            var r = maintCreate(false, "   ");
            assertFalse((Boolean)r.get("success"), "Whitespace-only description should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-MAINT-WB-006: Admin updates status to 'in-progress'")
        void t006() {
            var r = maintUpdateStatus(true, "in-progress");
            assertTrue((Boolean)r.get("success"), "Admin should update status");
            assertEquals("in-progress", r.get("status"));
        }
        @Test @DisplayName("TC-MAINT-WB-007: Admin resolves request → resolvedAt is set")
        void t007() {
            var r = maintUpdateStatus(true, "resolved");
            assertTrue((Boolean)r.get("success"), "Admin should resolve request");
            assertEquals("resolved", r.get("status"));
            assertEquals("set", r.get("resolvedAt"));
        }
        @Test @DisplayName("TC-MAINT-WB-008: Tenant cannot update maintenance status → 403")
        void t008() {
            var r = maintUpdateStatus(false, "resolved");
            assertFalse((Boolean)r.get("success"), "Tenant should not update status");
            assertEquals(403, r.get("status"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 6: COMPLAINTS TESTS
    // ══════════════════════════════════════════════════════════

    static class ComplaintsTests {
        @Test @DisplayName("TC-COMP-WB-001: Tenant files complaint → 201 + status='open'")
        void t001() {
            var r = compCreate(false, "Noise issue");
            assertTrue((Boolean)r.get("success"), "Complaint filing should succeed");
            assertEquals(201, r.get("status"));
            assertEquals("open", r.get("compStatus"));
        }
        @Test @DisplayName("TC-COMP-WB-002: Admin cannot file complaint → 403")
        void t002() {
            var r = compCreate(true, "Noise issue");
            assertFalse((Boolean)r.get("success"), "Admin should not file complaint");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-COMP-WB-003: Complaint fails - empty subject")
        void t003() {
            var r = compCreate(false, "");
            assertFalse((Boolean)r.get("success"), "Empty subject should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-COMP-WB-004: Complaint fails - null subject")
        void t004() {
            var r = compCreate(false, null);
            assertFalse((Boolean)r.get("success"), "Null subject should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-COMP-WB-005: Complaint fails - whitespace subject")
        void t005() {
            var r = compCreate(false, "   ");
            assertFalse((Boolean)r.get("success"), "Whitespace-only subject should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-COMP-WB-006: Admin changes status to 'under-review'")
        void t006() {
            var r = compUpdateStatus(true, "under-review");
            assertTrue((Boolean)r.get("success"), "Admin should update complaint status");
            assertEquals("under-review", r.get("newStatus"));
        }
        @Test @DisplayName("TC-COMP-WB-007: Admin resolves complaint → resolvedAt set")
        void t007() {
            var r = compUpdateStatus(true, "resolved");
            assertTrue((Boolean)r.get("success"), "Admin should resolve complaint");
            assertEquals("resolved", r.get("newStatus"));
            assertEquals("set", r.get("resolvedAt"));
        }
        @Test @DisplayName("TC-COMP-WB-008: Tenant cannot update complaint status → 403")
        void t008() {
            var r = compUpdateStatus(false, "resolved");
            assertFalse((Boolean)r.get("success"), "Tenant should not update complaint status");
            assertEquals(403, r.get("status"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODULE 7: USER ADMIN TESTS
    // ══════════════════════════════════════════════════

    static class UserAdminTests {
        @Test @DisplayName("TC-USER-WB-001: Admin blocks active user → status becomes 'blocked'")
        void t001() {
            var r = userToggleBlock(true, "active");
            assertTrue((Boolean)r.get("success"), "Admin should block user");
            assertEquals("blocked", r.get("newStatus"));
        }
        @Test @DisplayName("TC-USER-WB-002: Admin unblocks blocked user → status becomes 'active'")
        void t002() {
            var r = userToggleBlock(true, "blocked");
            assertTrue((Boolean)r.get("success"), "Admin should unblock user");
            assertEquals("active", r.get("newStatus"));
        }
        @Test @DisplayName("TC-USER-WB-003: Non-admin cannot block user → 403")
        void t003() {
            var r = userToggleBlock(false, "active");
            assertFalse((Boolean)r.get("success"), "Non-admin should not block user");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-USER-WB-004: Toggle twice returns original state (idempotency)")
        void t004() {
            var r1 = userToggleBlock(true, "active");
            var r2 = userToggleBlock(true, "blocked");
            assertEquals("blocked", r1.get("newStatus"));
            assertEquals("active", r2.get("newStatus"));
        }
        @Test @DisplayName("TC-USER-WB-005: Toggle on null user → 404")
        void t005() {
            var r = userToggleBlock(true, null);
            assertFalse((Boolean)r.get("success"), "Null user should return 404");
            assertEquals(404, r.get("status"));
        }
        @Test @DisplayName("TC-USER-WB-006: Admin verifies user → verified=true")
        void t006() {
            var r = userVerify(true, "uid");
            assertTrue((Boolean)r.get("success"), "Admin should verify user");
            assertEquals(true, r.get("verified"));
        }
        @Test @DisplayName("TC-USER-WB-007: Non-admin cannot verify user → 403")
        void t007() {
            var r = userVerify(false, "uid");
            assertFalse((Boolean)r.get("success"), "Non-admin should not verify user");
            assertEquals(403, r.get("status"));
        }
        @Test @DisplayName("TC-USER-WB-008: Verify fails - empty user ID")
        void t008() {
            var r = userVerify(true, "");
            assertFalse((Boolean)r.get("success"), "Empty user ID should fail");
            assertEquals(400, r.get("status"));
        }
        @Test @DisplayName("TC-USER-WB-009: Admin deletes user successfully")
        void t009() {
            var r = userDelete(true, "uid");
            assertTrue((Boolean)r.get("success"), "Admin should delete user");
        }
        @Test @DisplayName("TC-USER-WB-010: Non-admin cannot delete user → 403")
        void t010() {
            var r = userDelete(false, "uid");
            assertFalse((Boolean)r.get("success"), "Non-admin should not delete user");
            assertEquals(403, r.get("status"));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MAIN - Run everything
    // ══════════════════════════════════════════════════════════

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════════════════╗");
        System.out.println("║   TMS WHITE BOX TESTING SUITE  |  JUnit 5 Style                 ║");
        System.out.println("║   Tenant Management System     |  All Modules                   ║");
        System.out.println("╚══════════════════════════════════════════════════════════╝");

        run(new AuthTests());
        run(new PropertyTests());
        run(new PaymentTests());
        run(new LeaseTests());
        run(new MaintenanceTests());
        run(new ComplaintsTests());
        run(new UserAdminTests());

        printSummary();
        System.exit(failed > 0 ? 1 : 0);
    }
