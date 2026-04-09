import os

def bundle():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
        
    with open('styles.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('js/dataGenerator.js', 'r', encoding='utf-8') as f:
        js1 = f.read()
        
    with open('js/geoMap.js', 'r', encoding='utf-8') as f:
        js2 = f.read()
        
    with open('js/app.js', 'r', encoding='utf-8') as f:
        js3 = f.read()

    # Replace CSS tag
    html = html.replace('<link rel="stylesheet" href="styles.css?v=2026-mobile-fix">', f'<style>\n{css}\n</style>')
    html = html.replace('<link rel="stylesheet" href="styles.css">', '') # just in case
    
    # Replace JS tags
    js_bundle = f"<script>\n{js1}\n{js2}\n{js3}\n</script>"
    html = html.replace('<script src="js/dataGenerator.js?v=2"></script>', '')
    html = html.replace('<script src="js/geoMap.js?v=2"></script>', '')
    html = html.replace('<script src="js/app.js?v=2"></script>', js_bundle)
    
    with open('RouteX_Mobile.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
if __name__ == '__main__':
    bundle()
