package com.tms.blackbox;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.*;
import org.openqa.selenium.support.ui.*;
import io.github.bonigarcia.wdm.WebDriverManager;
import java.time.Duration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import static org.junit.jupiter.api.Assertions.*;

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  BLACK BOX TESTING - TMS (All Modules)                          ║
 * ║  Tool: Selenium WebDriver 4 + JUnit 5 + WebDriverManager        ║
 * ║                                                                  ║
 * ║  Setup:                                                          ║
 * ║   1. TMS backend: cd backend && npm start  (port 5000)          ║
 * ║   2. TMS frontend: Live Server on port 5500                     ║
 * ║      OR: python3 -m http.server 5500 inside TMS folder          ║
 * ║   3. Tenant and landlord test accounts are created and removed   ║
 * ║      automatically using the running backend.                    ║
 * ║   4. Set TMS_ADMIN_EMAIL and TMS_ADMIN_PASSWORD if the local      ║
 * ║      backend uses admin credentials other than the defaults.     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("TMS Black Box Tests - All Modules (Selenium)")
public class TMSBlackBoxTest {

    static WebDriver driver;
    static WebDriverWait wait;
    static final String BASE = "http://localhost:5500";
    static final String API = System.getProperty("tms.api.base", "http://localhost:5000/api");
    static final String ADMIN_EMAIL = System.getenv().getOrDefault("TMS_ADMIN_EMAIL", "adboy768@gmail.com");
    static final String ADMIN_PASSWORD = System.getenv().getOrDefault("TMS_ADMIN_PASSWORD", "adnan123@");
    static final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();
    static String tenantEmail;
    static String landlordEmail;
    static String adminToken;
    static String tenantId;
    static String landlordId;

    @BeforeAll
    static void setUp() throws Exception {
        provisionTestUsers();
        WebDriverManager.chromedriver().setup();
        ChromeOptions opts = new ChromeOptions();
        opts.addArguments("--headless=new", "--no-sandbox",
                          "--disable-dev-shm-usage", "--window-size=1366,768");
        driver = new ChromeDriver(opts);
        wait   = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
    }

    @AfterAll
    static void tearDown() throws Exception {
        try {
            if (driver != null) driver.quit();
        } finally {
            cleanUpTestUsers();
        }
    }

    static JsonObject apiRequest(String method, String path, JsonObject body, String token) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(API + path))
            .timeout(Duration.ofSeconds(20))
            .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        if ("GET".equals(method) || "DELETE".equals(method)) {
            request.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            request.method(method, HttpRequest.BodyPublishers.ofString(body.toString()));
        }

        HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        JsonObject result = JsonParser.parseString(response.body()).getAsJsonObject();
        if (response.statusCode() < 200 || response.statusCode() >= 300 || !result.has("success")
                || !result.get("success").getAsBoolean()) {
            String message = result.has("message") ? result.get("message").getAsString() : "Unexpected API response.";
            throw new IllegalStateException(method + " " + path + " failed (HTTP "
                + response.statusCode() + "): " + message);
        }
        return result;
    }

    static String registerTestUser(String email, String role, String name) throws Exception {
        JsonObject body = new JsonObject();
        body.addProperty("name", name);
        body.addProperty("email", email);
        body.addProperty("password", "testpass123");
        body.addProperty("role", role);
        return apiRequest("POST", "/auth/register", body, null)
            .getAsJsonObject("user").get("id").getAsString();
    }

    static void provisionTestUsers() throws Exception {
        JsonObject login = new JsonObject();
        login.addProperty("email", ADMIN_EMAIL);
        login.addProperty("password", ADMIN_PASSWORD);
        adminToken = apiRequest("POST", "/auth/login", login, null).get("token").getAsString();

        String runId = UUID.randomUUID().toString().replace("-", "");
        tenantEmail = "tms-blackbox-tenant-" + runId + "@example.com";
        landlordEmail = "tms-blackbox-landlord-" + runId + "@example.com";
        tenantId = registerTestUser(tenantEmail, "tenant", "Black Box Test Tenant");
        landlordId = registerTestUser(landlordEmail, "landlord", "Black Box Test Landlord");
    }

    static void cleanUpTestUsers() throws Exception {
        if (adminToken == null) return;
        if (tenantId != null) apiRequest("DELETE", "/users/" + tenantId, new JsonObject(), adminToken);
        if (landlordId != null) apiRequest("DELETE", "/users/" + landlordId, new JsonObject(), adminToken);
    }

    @AfterEach
    void goHome() { driver.get(BASE); }

    // ── Helpers ──────────────────────────────────────────────────────

    void clickTab(String tabText) {
        // Tab buttons: "Sign In" or "Sign Up"
        driver.findElement(By.xpath(
            "//button[contains(@class,'tab') and text()='" + tabText + "']"
        )).click();
    }

    void fillLogin(String email, String pw) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("signin-email")));
        WebElement e = driver.findElement(By.id("signin-email"));
        e.clear(); e.sendKeys(email);
        WebElement p = driver.findElement(By.id("signin-password"));
        p.clear(); p.sendKeys(pw);
        driver.findElement(By.id("signin-btn")).click();
    }

    void loginAsTenant() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin(tenantEmail, "testpass123");
        wait.until(ExpectedConditions.urlContains("tenant-dashboard"));
    }

    void loginAsLandlord() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin(landlordEmail, "testpass123");
        wait.until(ExpectedConditions.urlContains("landlord-dashboard"));
    }

    void loginAsAdmin() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
        wait.until(ExpectedConditions.urlContains("admin-dashboard"));
    }

    void clickNavItem(String textContains) {
        driver.findElement(By.xpath(
            "//button[contains(@class,'nav-item') and contains(.,'" + textContains + "')]"
        )).click();
    }

    WebElement waitVisible(By by) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(by));
    }

    boolean exists(By by) {
        return !driver.findElements(by).isEmpty();
    }

    void assertValidationAlert(By submitButton, String expectedMessage) {
        ((JavascriptExecutor) driver).executeScript(
            "window.__tmsAlertMessage = null; window.alert = message => { window.__tmsAlertMessage = String(message); };"
        );
        driver.findElement(submitButton).click();
        String actualMessage = wait.until(d -> (String) ((JavascriptExecutor) d)
            .executeScript("return window.__tmsAlertMessage;"));
        assertEquals(expectedMessage, actualMessage, "Validation alert text must match");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 1 — AUTH  (12 tests)
    // ════════════════════════════════════════════════════════════════════════

    @Test @Order(1)
    @DisplayName("TC-AUTH-BB-001: Home page loads successfully")
    void authBB001() {
        driver.get(BASE);
        assertFalse(driver.getTitle().isBlank(), "Page title must not be empty");
        assertTrue(exists(By.cssSelector("body")), "Body must be present");
    }

    @Test @Order(2)
    @DisplayName("TC-AUTH-BB-002: Sign In tab shows login form")
    void authBB002() {
        driver.get(BASE);
        clickTab("Sign In");
        WebElement form = waitVisible(By.id("form-signin"));
        assertTrue(form.isDisplayed(), "Sign In form must be visible after clicking Sign In tab");
    }

    @Test @Order(3)
    @DisplayName("TC-AUTH-BB-003: Login form has email and password fields")
    void authBB003() {
        driver.get(BASE);
        clickTab("Sign In");
        waitVisible(By.id("form-signin"));
        assertTrue(driver.findElement(By.id("signin-email")).isDisplayed(), "signin-email field must exist");
        assertTrue(driver.findElement(By.id("signin-password")).isDisplayed(), "signin-password field must exist");
    }

    @Test @Order(4)
    @DisplayName("TC-AUTH-BB-004: Password field type is 'password' (text is masked)")
    void authBB004() {
        driver.get(BASE);
        clickTab("Sign In");
        waitVisible(By.id("form-signin"));
        assertEquals("password",
            driver.findElement(By.id("signin-password")).getAttribute("type"),
            "signin-password must be type=password to mask text");
    }

    @Test @Order(5)
    @DisplayName("TC-AUTH-BB-005: Login with wrong credentials shows error message")
    void authBB005() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin("notexist@wrong.com", "badpassword");
        WebElement err = waitVisible(By.id("error-box"));
        assertTrue(err.isDisplayed(), "error-box must appear for wrong credentials");
        assertFalse(err.getText().isBlank(), "Error text must not be empty");
    }

    @Test @Order(6)
    @DisplayName("TC-AUTH-BB-006: Admin login redirects to admin-dashboard")
    void authBB006() {
        loginAsAdmin();
        assertTrue(driver.getCurrentUrl().contains("admin-dashboard"),
            "Admin must be redirected to admin-dashboard");
    }

    @Test @Order(7)
    @DisplayName("TC-AUTH-BB-007: Tenant login redirects to tenant-dashboard")
    void authBB007() {
        loginAsTenant();
        assertTrue(driver.getCurrentUrl().contains("tenant-dashboard"),
            "Tenant must be redirected to tenant-dashboard");
    }

    @Test @Order(8)
    @DisplayName("TC-AUTH-BB-008: Landlord login redirects to landlord-dashboard")
    void authBB008() {
        loginAsLandlord();
        assertTrue(driver.getCurrentUrl().contains("landlord-dashboard"),
            "Landlord must be redirected to landlord-dashboard");
    }

    @Test @Order(9)
    @DisplayName("TC-AUTH-BB-009: Sign Up tab shows registration form")
    void authBB009() {
        driver.get(BASE);
        clickTab("Sign Up");
        WebElement form = waitVisible(By.id("form-signup"));
        assertTrue(form.isDisplayed(), "Sign Up form must be visible after clicking Sign Up tab");
    }

    @Test @Order(10)
    @DisplayName("TC-AUTH-BB-010: Register form has all required fields")
    void authBB010() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("form-signup"));
        assertTrue(driver.findElement(By.id("signup-name")).isDisplayed(), "signup-name must exist");
        assertTrue(driver.findElement(By.id("signup-email")).isDisplayed(), "signup-email must exist");
        assertTrue(driver.findElement(By.id("signup-password")).isDisplayed(), "signup-password must exist");
        assertTrue(exists(By.id("role-tenant"))
                || exists(By.id("role-tenant")),  "role selection must exist");
    }

    @Test @Order(11)
    @DisplayName("TC-AUTH-BB-011: Role selection has Tenant and Landlord (no Admin option)")
    void authBB011() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("form-signup"));
        // Role cards
        assertTrue(exists(By.id("role-tenant")),   "role-tenant card must exist");
        assertTrue(exists(By.id("role-landlord")), "role-landlord card must exist");
        assertTrue(driver.findElement(By.id("role-tenant")).getText().contains("Tenant"), "Tenant role must be visible");
        assertTrue(driver.findElement(By.id("role-landlord")).getText().contains("Landlord"), "Landlord role must be visible");
        assertFalse(exists(By.id("role-admin")), "Admin role must not be available");
    }

    @Test @Order(12)
    @DisplayName("TC-AUTH-BB-012: Register with short password shows error")
    void authBB012() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("form-signup"));
            driver.findElement(By.id("signup-name")).sendKeys("Test User");
            driver.findElement(By.id("signup-email")).sendKeys("newuser" + System.currentTimeMillis() + "@test.com");
            driver.findElement(By.id("signup-password")).sendKeys("abc"); // only 3 chars
            driver.findElement(By.id("signup-confirm")).sendKeys("abc");
        // Click tenant role
        driver.findElement(By.id("role-tenant")).click();
        driver.findElement(By.id("signup-btn")).click();
        WebElement err = waitVisible(By.id("tms-popup"));
        assertTrue(err.getText().contains("Password too short"),
            "Validation popup must explain that the password is too short");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 2 — PROPERTY  (7 tests)
    // ════════════════════════════════════════════════════════════════════════

    @Test @Order(13)
    @DisplayName("TC-PROP-BB-001: Landlord dashboard has 'Add Property' button")
    void propBB001() {
        loginAsLandlord();
        WebElement btn = waitVisible(By.xpath(
            "//button[contains(.,'Add Property')]"));
        assertTrue(btn.isDisplayed(), "Add Property button must be visible for landlord");
    }

    @Test @Order(14)
    @DisplayName("TC-PROP-BB-002: Add Property button navigates to add-property page")
    void propBB002() {
        loginAsLandlord();
        // Click nav item for Add Property
        driver.findElement(By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add')]")).click();
        WebElement form = waitVisible(By.id("page-add-property"));
        assertTrue(form.isDisplayed(), "Add Property page must be visible after clicking Add Property");
    }

    @Test @Order(15)
    @DisplayName("TC-PROP-BB-003: Property form has ap-title, ap-rent, ap-area fields")
    void propBB003() {
        loginAsLandlord();
        driver.findElement(By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add')]")).click();
        waitVisible(By.id("page-add-property"));
        assertTrue(driver.findElement(By.id("ap-title")).isDisplayed(), "ap-title field must exist");
        assertTrue(driver.findElement(By.id("ap-rent")).isDisplayed(),  "ap-rent field must exist");
        assertTrue(driver.findElement(By.id("ap-area")).isDisplayed(),  "ap-area field must exist");
    }

    @Test @Order(16)
    @DisplayName("TC-PROP-BB-004: Submit empty property form shows validation (alert or error)")
    void propBB004() {
        loginAsLandlord();
        driver.findElement(By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add')]")).click();
        waitVisible(By.id("page-add-property"));
        driver.findElement(By.id("ap-btn")).click();
        WebElement msg = waitVisible(By.id("ap-msg"));
        assertFalse(msg.getText().isBlank(), "ap-msg must show a validation error");
    }

    @Test @Order(17)
    @DisplayName("TC-PROP-BB-005: Landlord dashboard shows property grid section")
    void propBB005() {
        loginAsLandlord();
        assertTrue(exists(By.id("prop-grid")) || exists(By.id("prop-grid-2")),
            "Property grid must exist on landlord dashboard");
    }

    @Test @Order(18)
    @DisplayName("TC-PROP-BB-006: Admin dashboard shows properties section")
    void propBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-properties")) || exists(By.cssSelector("[id*='propert']")),
            "Admin dashboard must have a properties section");
    }

    @Test @Order(19)
    @DisplayName("TC-PROP-BB-007: Tenant dashboard does NOT show Add Property button")
    void propBB007() {
        loginAsTenant();
        List<WebElement> addBtns = driver.findElements(
            By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add Property')]")
        );
        assertTrue(addBtns.isEmpty(), "Tenant must NOT see Add Property nav button");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 3 — PAYMENT  (6 tests)
    // ════════════════════════════════════════════════════════════════════════

    @Test @Order(20)
    @DisplayName("TC-PAY-BB-001: Tenant dashboard has page-payments section")
    void payBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-payments")), "page-payments section must exist");
    }

    @Test @Order(21)
    @DisplayName("TC-PAY-BB-002: Clicking Payments nav shows the payment form")
    void payBB002() {
        loginAsTenant();
        clickNavItem("Payment");
        WebElement form = waitVisible(By.id("page-payments"));
        assertTrue(form.isDisplayed(), "Payment page must be visible after nav click");
    }

    @Test @Order(22)
    @DisplayName("TC-PAY-BB-003: Payment form has pamt (amount) and pmon (month) fields")
    void payBB003() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("page-payments"));
        assertTrue(driver.findElement(By.id("pamt")).isDisplayed(), "pamt (amount) field must exist");
        assertTrue(driver.findElement(By.id("pmon")).isDisplayed(), "pmon (month) field must exist");
    }

    @Test @Order(23)
    @DisplayName("TC-PAY-BB-004: Submit empty payment form shows JS alert")
    void payBB004() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("page-payments"));
        assertValidationAlert(By.id("psubmit-btn"), "Amount and month are required.");
    }

    @Test @Order(24)
    @DisplayName("TC-PAY-BB-005: Payment history table (paymentHistory) visible")
    void payBB005() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("page-payments"));
        assertTrue(exists(By.id("pay-tbody")), "Payment history table must exist");
    }

    @Test @Order(25)
    @DisplayName("TC-PAY-BB-006: Admin dashboard shows page-payments section")
    void payBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-payments")), "Admin must have page-payments section");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 4 — MAINTENANCE  (6 tests)
    // ════════════════════════════════════════════════════════════════════════

    @Test @Order(26)
    @DisplayName("TC-MAINT-BB-001: Tenant dashboard has page-maintenance section")
    void maintBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-maintenance")), "page-maintenance must exist on tenant dashboard");
    }

    @Test @Order(27)
    @DisplayName("TC-MAINT-BB-002: Clicking Maintenance nav shows the maintenance form")
    void maintBB002() {
        loginAsTenant();
        clickNavItem("Maintenance");
        WebElement page = waitVisible(By.id("page-maintenance"));
        assertTrue(page.isDisplayed(), "Maintenance page must be visible after nav click");
    }

    @Test @Order(28)
    @DisplayName("TC-MAINT-BB-003: Maintenance form has maintDescription textarea")
    void maintBB003() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("page-maintenance"));
        assertTrue(driver.findElement(By.id("md")).isDisplayed(),
            "Maintenance description textarea must exist in the form");
    }

    @Test @Order(29)
    @DisplayName("TC-MAINT-BB-004: Submit maintenance without description shows JS alert")
    void maintBB004() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("page-maintenance"));
        assertValidationAlert(By.id("msubmit-btn"), "Please describe the issue.");
    }

    @Test @Order(30)
    @DisplayName("TC-MAINT-BB-005: Maintenance form has type (mt) and priority (mp) selects")
    void maintBB005() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("page-maintenance"));
        assertTrue(driver.findElement(By.id("mt")).isDisplayed(), "Issue type select (mt) must exist");
        assertTrue(driver.findElement(By.id("mp")).isDisplayed(), "Priority select (mp) must exist");
    }

    @Test @Order(31)
    @DisplayName("TC-MAINT-BB-006: Admin dashboard has page-maintenance section")
    void maintBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-maintenance")), "Admin dashboard must have page-maintenance section");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 5 — COMPLAINTS  (6 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(32)
    @DisplayName("TC-COMP-BB-001: Tenant dashboard has page-complaints section")
    void compBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-complaints")), "page-complaints must exist on tenant dashboard");
    }

    @Test @Order(33)
    @DisplayName("TC-COMP-BB-002: Clicking Complaints nav shows the complaint form")
    void compBB002() {
        loginAsTenant();
        clickNavItem("Complaint");
        WebElement page = waitVisible(By.id("page-complaints"));
        assertTrue(page.isDisplayed(), "Complaints page must be visible after nav click");
    }

    @Test @Order(34)
    @DisplayName("TC-COMP-BB-003: Complaint form has complaintSubject field")
    void compBB003() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("page-complaints"));
        assertTrue(driver.findElement(By.id("cs")).isDisplayed(),
            "Complaint subject field must exist in the form");
    }

    @Test @Order(35)
    @DisplayName("TC-COMP-BB-004: Submit complaint without subject shows JS alert")
    void compBB004() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("page-complaints"));
        assertValidationAlert(By.id("csubmit-btn"), "Please enter a subject.");
    }

    @Test @Order(36)
    @DisplayName("TC-COMP-BB-005: Complaint form has complaintDescription and category (cc)")
    void compBB005() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("page-complaints"));
        assertTrue(driver.findElement(By.id("cd")).isDisplayed(),
            "Complaint description must exist");
        assertTrue(driver.findElement(By.id("cc")).isDisplayed(),
            "Category select (cc) must exist");
    }

    @Test @Order(37)
    @DisplayName("TC-COMP-BB-006: Admin dashboard has page-complaints section")
    void compBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-complaints")), "Admin dashboard must have complaints section");
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODULE 6 — USERS ADMIN  (5 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(38)
    @DisplayName("TC-USER-BB-001: Admin dashboard shows statsOverview section")
    void userBB001() {
        loginAsAdmin();
        assertTrue(exists(By.id("statsOverview")), "statsOverview must be on admin dashboard");
    }

    @Test @Order(39)
    @DisplayName("TC-USER-BB-002: Admin dashboard has page-tenants section")
    void userBB002() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-tenants")), "page-tenants must be on admin dashboard");
    }

    @Test @Order(40)
    @DisplayName("TC-USER-BB-003: Admin dashboard has page-landlords section")
    void userBB003() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-landlords")), "page-landlords must be on admin dashboard");
    }

    @Test @Order(41)
    @DisplayName("TC-USER-BB-004: Admin stats show d-tenants, d-landlords, d-props")
    void userBB004() {
        loginAsAdmin();
        assertTrue(exists(By.id("d-tenants")),   "d-tenants stat must exist");
        assertTrue(exists(By.id("d-landlords")), "d-landlords stat must exist");
        assertTrue(exists(By.id("d-props")),     "d-props stat must exist");
    }

    @Test @Order(42)
    @DisplayName("TC-USER-BB-005: Tenant dashboard does NOT have admin pages")
    void userBB005() {
        loginAsTenant();
        assertFalse(exists(By.id("page-tenants")),
            "Tenant dashboard must NOT have admin page-tenants section");
        assertFalse(exists(By.id("page-landlords")),
            "Tenant dashboard must NOT have admin page-landlords section");
    }
}
