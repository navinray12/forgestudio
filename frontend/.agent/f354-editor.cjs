const fs = require('fs');

let we = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

// Replace imports with lazy
we = we.replace(
    'import PopupManagerModal from "./components/PopupManagerModal";',
    'const PopupManagerModal = React.lazy(() => import("./components/PopupManagerModal"));'
);

we = we.replace(
    'import CustomCodeManagerModal from "./components/CustomCodeManagerModal";',
    'const CustomCodeManagerModal = React.lazy(() => import("./components/CustomCodeManagerModal"));'
);

// We should also replace `<PopupManagerModal isOpen={isPopupManagerOpen} ... />` with a React.Suspense wrapped conditional
const popupModalOriginal = `<PopupManagerModal
          isOpen={isPopupManagerOpen}
          onClose={() => setIsPopupManagerOpen(false)}
          popups={popups}
          onPopupsChange={setPopups}
          saving={saving}
          websiteId={websiteId || "default"}
        />`;
const popupModalNew = `{isPopupManagerOpen && (
          <React.Suspense fallback={null}>
            <PopupManagerModal
              isOpen={isPopupManagerOpen}
              onClose={() => setIsPopupManagerOpen(false)}
              popups={popups}
              onPopupsChange={setPopups}
              saving={saving}
              websiteId={websiteId || "default"}
            />
          </React.Suspense>
        )}`;
we = we.replace(popupModalOriginal, popupModalNew);

const codeModalOriginal = `<CustomCodeManagerModal
          isOpen={isCustomCodeManagerOpen}
          onClose={() => setIsCustomCodeManagerOpen(false)}
          snippets={customCodeSnippets}
          onSnippetsChange={setCustomCodeSnippets}
          activePages={activePages}
        />`;
const codeModalNew = `{isCustomCodeManagerOpen && (
          <React.Suspense fallback={null}>
            <CustomCodeManagerModal
              isOpen={isCustomCodeManagerOpen}
              onClose={() => setIsCustomCodeManagerOpen(false)}
              snippets={customCodeSnippets}
              onSnippetsChange={setCustomCodeSnippets}
              activePages={activePages}
            />
          </React.Suspense>
        )}`;
we = we.replace(codeModalOriginal, codeModalNew);

fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', we);
