package com.tms.blackbox;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.*;
import org.openqa.selenium.support.ui.*;
import io.github.bonigarcia.wdm.WebDriverManager;
import java.time.Duration;
import java.util.List;
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
 * ║   3. Test accounts in DB:                                        ║
 * ║      tenant@test.com   / testpass123  (role: tenant)            ║
 * ║      landlord@test.com / testpass123  (role: landlord)          ║
 * ║      admin: adboy768@gmail.com / adnan123@                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("TMS Black Box Tests - All Modules (Selenium)")
public class TMSBlackBoxTest {

    static WebDriver driver;
    static WebDriverWait wait;
    static final String BASE = "http://localhost:5500";

    @BeforeAll
    static void setUp() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions opts = new ChromeOptions();
        opts.addArguments("--headless=new", "--no-sandbox",
                          "--disable-dev-shm-usage", "--window-size=1366,768");
        driver = new ChromeDriver(opts);
        wait   = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
    }

    @AfterAll
    static void tearDown() { if (driver != null) driver.quit(); }

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
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginEmail")));
        WebElement e = driver.findElement(By.id("loginEmail"));
        e.clear(); e.sendKeys(email);
        WebElement p = driver.findElement(By.id("loginPassword"));
        p.clear(); p.sendKeys(pw);
        driver.findElement(By.id("signin-btn")).click();
    }

    void loginAsTenant() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin("tenant@test.com", "testpass123");
        wait.until(ExpectedConditions.urlContains("tenant-dashboard"));
    }

    void loginAsLandlord() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin("landlord@test.com", "testpass123");
        wait.until(ExpectedConditions.urlContains("landlord-dashboard"));
    }

    void loginAsAdmin() {
        driver.get(BASE);
        clickTab("Sign In");
        fillLogin("adboy768@gmail.com", "adnan123@");
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

    // ════════════════════════════════════════════════════════════════
    // MODULE 1 — AUTH  (12 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(1)
    @DisplayName("TC-AUTH-BB-001: Home page loads successfully")
    void authBB001() {
        driver.get(BASE);
        assertFalse(driver.getTitle().isBlank(), "Page title must not be empty");
        assertTrue(exists(By.cssSelector("body")), "Body must be present");
    }

    @Test @Order(2)
    @DisplayName("TC-AUTH-BB-002: Sign In tab shows login form (loginModal visible)")
    void authBB002() {
        driver.get(BASE);
        clickTab("Sign In");
        WebElement modal = waitVisible(By.id("loginModal"));
        assertTrue(modal.isDisplayed(), "loginModal must be visible after clicking Sign In tab");
    }

    @Test @Order(3)
    @DisplayName("TC-AUTH-BB-003: Login form has loginEmail and loginPassword fields")
    void authBB003() {
        driver.get(BASE);
        clickTab("Sign In");
        waitVisible(By.id("loginModal"));
        assertTrue(driver.findElement(By.id("loginEmail")).isDisplayed(),   "loginEmail field must exist");
        assertTrue(driver.findElement(By.id("loginPassword")).isDisplayed(),"loginPassword field must exist");
    }

    @Test @Order(4)
    @DisplayName("TC-AUTH-BB-004: Password field type is 'password' (text is masked)")
    void authBB004() {
        driver.get(BASE);
        clickTab("Sign In");
        waitVisible(By.id("loginModal"));
        assertEquals("password",
            driver.findElement(By.id("loginPassword")).getAttribute("type"),
            "loginPassword must be type=password to mask text");
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
    @DisplayName("TC-AUTH-BB-009: Sign Up tab shows register form (registerModal visible)")
    void authBB009() {
        driver.get(BASE);
        clickTab("Sign Up");
        WebElement modal = waitVisible(By.id("registerModal"));
        assertTrue(modal.isDisplayed(), "registerModal must be visible after clicking Sign Up tab");
    }

    @Test @Order(10)
    @DisplayName("TC-AUTH-BB-010: Register form has all required fields")
    void authBB010() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("registerModal"));
        assertTrue(driver.findElement(By.id("registerName")).isDisplayed(),     "registerName must exist");
        assertTrue(driver.findElement(By.id("registerEmail")).isDisplayed(),    "registerEmail must exist");
        assertTrue(driver.findElement(By.id("registerPassword")).isDisplayed(), "registerPassword must exist");
        assertTrue(driver.findElement(By.id("registerRole")).isDisplayed()
                || exists(By.id("role-tenant")),  "role selection must exist");
    }

    @Test @Order(11)
    @DisplayName("TC-AUTH-BB-011: Role selection has Tenant and Landlord (no Admin option)")
    void authBB011() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("registerModal"));
        // Role cards
        assertTrue(exists(By.id("role-tenant")),   "role-tenant card must exist");
        assertTrue(exists(By.id("role-landlord")), "role-landlord card must exist");
        // registerRole select (hidden) has tenant/landlord options
        Select sel = new Select(driver.findElement(By.id("registerRole")));
        List<WebElement> opts = sel.getOptions();
        boolean hasTenant   = opts.stream().anyMatch(o -> "tenant".equals(o.getAttribute("value")));
        boolean hasLandlord = opts.stream().anyMatch(o -> "landlord".equals(o.getAttribute("value")));
        boolean noAdmin     = opts.stream().noneMatch(o -> "admin".equals(o.getAttribute("value")));
        assertTrue(hasTenant,   "registerRole must have tenant option");
        assertTrue(hasLandlord, "registerRole must have landlord option");
        assertTrue(noAdmin,     "registerRole must NOT have admin option");
    }

    @Test @Order(12)
    @DisplayName("TC-AUTH-BB-012: Register with short password shows error")
    void authBB012() {
        driver.get(BASE);
        clickTab("Sign Up");
        waitVisible(By.id("registerModal"));
        driver.findElement(By.id("registerName")).sendKeys("Test User");
        driver.findElement(By.id("registerEmail")).sendKeys("newuser" + System.currentTimeMillis() + "@test.com");
        driver.findElement(By.id("registerPassword")).sendKeys("abc"); // only 3 chars
        driver.findElement(By.id("registerConfirm")).sendKeys("abc");
        // Click tenant role
        driver.findElement(By.id("role-tenant")).click();
        driver.findElement(By.id("signup-btn")).click();
        WebElement err = waitVisible(By.id("error-box"));
        assertTrue(err.isDisplayed(), "Error must appear for short password");
    }

    // ════════════════════════════════════════════════════════════════
    // MODULE 2 — PROPERTY  (7 tests)
    // ════════════════════════════════════════════════════════════════

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
        WebElement form = waitVisible(By.id("addPropertyModal"));
        assertTrue(form.isDisplayed(), "addPropertyModal must be visible after clicking Add Property");
    }

    @Test @Order(15)
    @DisplayName("TC-PROP-BB-003: Property form has ap-title, ap-rent, ap-area fields")
    void propBB003() {
        loginAsLandlord();
        driver.findElement(By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add')]")).click();
        waitVisible(By.id("addPropertyModal"));
        assertTrue(driver.findElement(By.id("ap-title")).isDisplayed(), "ap-title field must exist");
        assertTrue(driver.findElement(By.id("ap-rent")).isDisplayed(),  "ap-rent field must exist");
        assertTrue(driver.findElement(By.id("ap-area")).isDisplayed(),  "ap-area field must exist");
    }

    @Test @Order(16)
    @DisplayName("TC-PROP-BB-004: Submit empty property form shows validation (alert or error)")
    void propBB004() {
        loginAsLandlord();
        driver.findElement(By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add')]")).click();
        waitVisible(By.id("addPropertyModal"));
        // Click submit without filling
        driver.findElement(By.id("ap-btn")).click();
        // Either JS alert OR ap-msg error shown
        try {
            Alert alert = wait.until(ExpectedConditions.alertIsPresent());
            assertFalse(alert.getText().isBlank(), "Alert text must not be empty");
            alert.accept();
        } catch (Exception e) {
            // Check ap-msg
            WebElement msg = driver.findElement(By.id("ap-msg"));
            assertTrue(msg.isDisplayed(), "ap-msg must show validation error");
        }
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
            By.xpath("//button[contains(@class,'nav-item') and contains(.,'Add Property')]"));
        assertTrue(addBtns.isEmpty(), "Tenant must NOT see Add Property nav button");
    }

    // ════════════════════════════════════════════════════════════════
    // MODULE 3 — PAYMENT  (6 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(20)
    @DisplayName("TC-PAY-BB-001: Tenant dashboard has page-payments section")
    void payBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-payments")), "page-payments section must exist");
    }

    @Test @Order(21)
    @DisplayName("TC-PAY-BB-002: Clicking Payments nav shows paymentModal form")
    void payBB002() {
        loginAsTenant();
        clickNavItem("Payment");
        WebElement form = waitVisible(By.id("paymentModal"));
        assertTrue(form.isDisplayed(), "paymentModal must be visible after nav click");
    }

    @Test @Order(22)
    @DisplayName("TC-PAY-BB-003: Payment form has pamt (amount) and pmon (month) fields")
    void payBB003() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("paymentModal"));
        assertTrue(driver.findElement(By.id("pamt")).isDisplayed(), "pamt (amount) field must exist");
        assertTrue(driver.findElement(By.id("pmon")).isDisplayed(), "pmon (month) field must exist");
    }

    @Test @Order(23)
    @DisplayName("TC-PAY-BB-004: Submit empty payment form shows JS alert")
    void payBB004() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("paymentModal"));
        driver.findElement(By.id("psubmit-btn")).click();
        Alert alert = wait.until(ExpectedConditions.alertIsPresent());
        assertFalse(alert.getText().isBlank(), "Alert must appear for empty payment form");
        alert.accept();
    }

    @Test @Order(24)
    @DisplayName("TC-PAY-BB-005: Payment history table (paymentHistory) visible")
    void payBB005() {
        loginAsTenant();
        clickNavItem("Payment");
        waitVisible(By.id("paymentModal"));
        assertTrue(exists(By.id("paymentHistory")), "paymentHistory table must exist");
    }

    @Test @Order(25)
    @DisplayName("TC-PAY-BB-006: Admin dashboard shows page-payments section")
    void payBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-payments")), "Admin must have page-payments section");
    }

    // ════════════════════════════════════════════════════════════════
    // MODULE 4 — MAINTENANCE  (6 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(26)
    @DisplayName("TC-MAINT-BB-001: Tenant dashboard has page-maintenance section")
    void maintBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-maintenance")), "page-maintenance must exist on tenant dashboard");
    }

    @Test @Order(27)
    @DisplayName("TC-MAINT-BB-002: Clicking Maintenance nav shows maintenanceModal form")
    void maintBB002() {
        loginAsTenant();
        clickNavItem("Maintenance");
        WebElement modal = waitVisible(By.id("maintenanceModal"));
        assertTrue(modal.isDisplayed(), "maintenanceModal must be visible");
    }

    @Test @Order(28)
    @DisplayName("TC-MAINT-BB-003: Maintenance form has maintDescription textarea")
    void maintBB003() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("maintenanceModal"));
        assertTrue(driver.findElement(By.id("maintDescription")).isDisplayed(),
            "maintDescription textarea must exist in maintenance form");
    }

    @Test @Order(29)
    @DisplayName("TC-MAINT-BB-004: Submit maintenance without description shows JS alert")
    void maintBB004() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("maintenanceModal"));
        driver.findElement(By.id("msubmit-btn")).click();
        Alert alert = wait.until(ExpectedConditions.alertIsPresent());
        assertFalse(alert.getText().isBlank(), "Alert must appear for empty maintenance form");
        alert.accept();
    }

    @Test @Order(30)
    @DisplayName("TC-MAINT-BB-005: Maintenance form has type (mt) and priority (mp) selects")
    void maintBB005() {
        loginAsTenant();
        clickNavItem("Maintenance");
        waitVisible(By.id("maintenanceModal"));
        assertTrue(driver.findElement(By.id("mt")).isDisplayed(), "Issue type select (mt) must exist");
        assertTrue(driver.findElement(By.id("mp")).isDisplayed(), "Priority select (mp) must exist");
    }

    @Test @Order(31)
    @DisplayName("TC-MAINT-BB-006: Admin dashboard has page-maintenance section")
    void maintBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-maintenance")), "Admin must have page-maintenance section");
    }

    // ════════════════════════════════════════════════════════════════
    // MODULE 5 — COMPLAINTS  (6 tests)
    // ════════════════════════════════════════════════════════════════

    @Test @Order(32)
    @DisplayName("TC-COMP-BB-001: Tenant dashboard has page-complaints section")
    void compBB001() {
        loginAsTenant();
        assertTrue(exists(By.id("page-complaints")), "page-complaints must exist on tenant dashboard");
    }

    @Test @Order(33)
    @DisplayName("TC-COMP-BB-002: Clicking Complaints nav shows complaintModal form")
    void compBB002() {
        loginAsTenant();
        clickNavItem("Complaint");
        WebElement modal = waitVisible(By.id("complaintModal"));
        assertTrue(modal.isDisplayed(), "complaintModal must be visible");
    }

    @Test @Order(34)
    @DisplayName("TC-COMP-BB-003: Complaint form has complaintSubject field")
    void compBB003() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("complaintModal"));
        assertTrue(driver.findElement(By.id("complaintSubject")).isDisplayed(),
            "complaintSubject field must exist in complaint form");
    }

    @Test @Order(35)
    @DisplayName("TC-COMP-BB-004: Submit complaint without subject shows JS alert")
    void compBB004() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("complaintModal"));
        driver.findElement(By.id("csubmit-btn")).click();
        Alert alert = wait.until(ExpectedConditions.alertIsPresent());
        assertFalse(alert.getText().isBlank(), "Alert must appear for empty complaint subject");
        alert.accept();
    }

    @Test @Order(36)
    @DisplayName("TC-COMP-BB-005: Complaint form has complaintDescription and category (cc)")
    void compBB005() {
        loginAsTenant();
        clickNavItem("Complaint");
        waitVisible(By.id("complaintModal"));
        assertTrue(driver.findElement(By.id("complaintDescription")).isDisplayed(),
            "complaintDescription must exist");
        assertTrue(driver.findElement(By.id("cc")).isDisplayed(),
            "Category select (cc) must exist");
    }

    @Test @Order(37)
    @DisplayName("TC-COMP-BB-006: Admin dashboard has page-complaints section")
    void compBB006() {
        loginAsAdmin();
        assertTrue(exists(By.id("page-complaints")), "Admin must have page-complaints section");
    }

    // ════════════════════════════════════════════════════════════════
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
