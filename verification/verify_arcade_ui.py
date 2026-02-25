
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Test Mobile View (Orbital)
        page = browser.new_page(viewport={'width': 375, 'height': 812})
        print("Navigating to Arcade (Orbital) - Mobile")
        page.goto("http://localhost:8000/Arcade.html?sim=orbital")

        # Wait for loading overlay to disappear
        print("Waiting for loading overlay to hide...")
        try:
            page.wait_for_selector("#loading-overlay", state="hidden", timeout=10000)
        except:
            print("Loading overlay timed out or not found.")

        # Wait for HUD
        page.wait_for_selector(".hud-bottom-group", timeout=5000)

        # Take screenshot
        page.screenshot(path="verification/arcade_mobile_orbital.png")
        print("Screenshot saved: verification/arcade_mobile_orbital.png")

        page.close()

        # Test Desktop View (Orbital)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        print("Navigating to Arcade (Orbital) - Desktop")
        page.goto("http://localhost:8000/Arcade.html?sim=orbital")

        print("Waiting for loading overlay to hide...")
        try:
            page.wait_for_selector("#loading-overlay", state="hidden", timeout=10000)
        except:
            print("Loading overlay timed out.")

        page.wait_for_selector(".hud-bottom-group", timeout=5000)

        page.screenshot(path="verification/arcade_desktop_orbital.png")
        print("Screenshot saved: verification/arcade_desktop_orbital.png")

        page.close()
        browser.close()

if __name__ == "__main__":
    run()
