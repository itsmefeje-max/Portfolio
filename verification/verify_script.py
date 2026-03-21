from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport size
        context = browser.new_context(viewport={'width': 430, 'height': 932})
        page = context.new_page()

        page.goto("http://localhost:3000/Arcade.html?sim=solar")

        # Wait for Loading Manager to hide the overlay
        page.locator("#loading-overlay").wait_for(state="hidden", timeout=15000)

        # Let the simulation settle
        page.wait_for_timeout(2000)

        # Capture screenshot
        screenshot_path = "verification/solar_final.png"
        page.screenshot(path=screenshot_path)
        print(f"Captured screenshot: {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify()