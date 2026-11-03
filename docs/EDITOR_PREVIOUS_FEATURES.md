# Previous editor features absent from the five PDF screens

This is a source-code/UI access inventory, not a claim that every external integration has been provisioned or tested. The supplied PDFs show five composed editor views; they do not specify every existing widget, developer tool or publishing integration. Existing content is preserved.

The header ellipsis (**More editor tools**) reveals the previous toolbar and an explicit extra-tools row. The full previous inspector is available under **Advanced / All element settings (previous editor)**. On restricted client roles, the existing content-only inspector remains available; design actions remain disabled.

## Features outside the PDF layouts

| Previous feature | Where it is available now | Notes |
| --- | --- | --- |
| Full widget library beyond the 18 PDF block cards | Elements / Add | The registry inventory below lists widgets absent from the PDF Blocks grid. |
| Favorite widgets and favorite reusable components | Elements | Favorites remain local preferences. |
| Widget visibility/enable-disable manager | More editor tools / Element Manager | Restored an explicit open action; hiding widgets preserves existing content. |
| Atomic elements, global elements and reusable components | Elements / Atomic; canvas context menu | Existing components and insertion paths retained. |
| Page CRUD, slug editing and home-page selection | Pages / Add page; More editor tools / Manage Pages | The PDF shows only the simple page list. |
| Header/footer/single/archive/404/search-result theme scopes | More editor tools / original scope selector | Existing scope data and selection retained. |
| Multi-selection, move/reorder, copy/paste, duplicate and delete | Canvas / layer selection / context menus / original toolbar / shortcuts | The PDF does not show the full set of editing actions. |
| Copy/paste styles and save as reusable component | Canvas selected-element toolbar and context menu | Existing handlers retained. |
| Replacement templates and website kits | Original toolbar / Templates / More editor tools / Import Website Kit | Restored a direct kit-import entry. |
| Revision history and restore | More editor tools / Revision History | Uses the existing revision-history service. |
| Finder and command search | Original toolbar Search; Ctrl/Cmd+K | Original command palette retained. |
| Keyboard-shortcut reference | More editor tools / Keyboard Shortcuts | Restored a direct open action. |
| Fullscreen canvas | Original toolbar; Esc to exit | Existing fullscreen mode retained. |
| Canvas theme, alignment grid and editor preferences | Original toolbar / Settings | Separate from website design-token theme and visitor contrast preferences. |
| Autosave preferences and status | Settings / existing autosave feature | Manual saves now accurately distinguish server and local fallback. |
| Full element property/content inspectors | Advanced / All element settings (previous editor) | Includes widget-specific fields, typography, backgrounds, sizing and other advanced settings. |
| Hover-state style editing and breakpoint override resets | Full previous inspector | Separate from the simplified Animation hover trigger. |
| Grid/masonry, alignment, positioning, transforms, z-index and scroll-snap controls | Full previous inspector | Existing detailed layout controls retained. |
| Display conditions, query builder and dynamic-content bindings | Elements and full previous inspector | Existing data widgets remain editable; providers must be configured separately. |
| Background video/slideshow, galleries, carousels and lightboxes | Elements and full previous inspector | Not shown in the PDF's compact Blocks grid. |
| Detailed motion: sticky, pointer tracking, 3D tilt and custom interaction rules | Full previous inspector / Motion & Interactions | The six-card PDF view supplements these controls. |
| Full design-variable manager and global utility classes | Original toolbar / Tokens / Classes | Same canonical variable/class records; editor token/class CSS preview now works. |
| Font library and icon picker | More editor tools / Manage Fonts; relevant element inspectors | Uses existing library/picker implementations. |
| Element CSS, selectors/pseudo states and custom DOM attributes | Full previous inspector / developer controls | Existing DeveloperModal modes retained. |
| HTML/React/code import and code export | Original toolbar / Developer Mode; existing import controls | Existing exporter/importer retained. Standalone exported motion is not covered by the new shared React preview tests. |
| Popup manager, rules and popup preview | More editor tools / Popup Manager | Explicit access restored. |
| Collaboration presence and design notes | Original toolbar / collaborator presence / Notes | Collaboration needs the existing realtime backend to be running. |
| Component access and client editing permissions | More editor tools / Component Permissions; existing restricted editor | Uses existing permission APIs. |
| SEO/quality and accessibility audits | Original toolbar; More editor tools / SEO and Accessibility Audit | Provider/integration availability remains subject to configuration. |
| Multilingual export and RTL controls | More editor tools / Multilingual Export; Settings | External translation plugins/services remain configuration-dependent. |
| Back-to-top, floating action button, maintenance mode and page/site metadata | Settings; full previous inspector with no selected element | Existing settings are preserved. |
| Accessibility statement and full visitor toolbar (text scale, spacing, speech, etc.) | Advanced / Global Panel / floating accessibility button | The PDF shows only eight shortcuts; visitor preferences remain browser-local rather than forcing settings on all visitors. |
| A/B experiments and conversion testing | Original toolbar / A/B Tests | Existing experiment manager retained. |
| Publishing validation, releases, deployment and rollback controls | Publish modal | Production hosting/WordPress/SFTP providers need real configuration; this audit does not deploy a site. |
| Commerce, payments, forms and integration-specific settings | Elements, widget inspectors and existing dashboard tools | Existing UI retained; live stores, payment credentials and external providers are not fabricated. |

## Exact widget registry entries absent from the PDF Blocks cards

These remain in the previous **Elements** library, subject to widget visibility settings. Labels found in code are listed without claiming a configured external account or provider.

### Basic

Search Bar, Import Asset / File, Favorite Widgets, Reusable Components, Template.

### Commerce

WooCommerce Builder, Single Product Card, Product Title, Product Images, Product Price, Add to Cart, Product Rating, Product Stock Status, Product Meta, Product Content, Short Description, Product Data Tabs, Additional Info, Related Products, Upsells & Cross-sells, Products Query Grid, Custom Add to Cart, Product Categories, Menu Cart Drawer, Shopping Cart, Checkout Form, My Account Dashboard, Purchase Summary, WooCommerce Notices, Shop Layout Switcher, Product Archive, Product Page Template, Product Archive Template, Product Add-Ons, PayPal Button, Stripe Button.

### Content

Posts, Loop Grid, Portfolio, Price Table, Price List, Reviews, Table of Contents, Countdown.

### Interactive

Animated Headline, Flip Box, Call to Action, Code Highlight, Lottie Animation, Login.

### Layout

Off Canvas, Mega Menu, Nav Menu.

### Media

Gallery, Basic Gallery, Slides, Media Carousel, Basic Media Carousel, Testimonial Carousel, Nested Carousel, Loop Carousel, Video Playlist, Audio Playlist, Image Carousel, Dynamic Lightbox, SVG / Custom Icon, Icon Library.

### Social

Share Buttons, Facebook Integration.

### navigation

Breadcrumbs, WP Menu, Menu Anchor, Post Nav, Taxonomy Filter.

## Reference-only differences and limits

- The sample storefront content, page names, folder counts and product data in the PDFs are design examples. Existing projects are not overwritten with fabricated pages, products or counts.
- The PDF rail includes an AI label but supplies no AI screen or behavior. There was no editor AI-assistant implementation in the previous WebsiteEditor. A configured generative-AI backend is not claimed or fabricated; AI hosting/dashboard features are separate.
- Some advanced widgets are available through Elements rather than the PDF's compact Blocks cards.
- Fonts uploaded in Assets are stored/downloadable; font-file installation is distinct from selecting a supported font through Manage Fonts.
- The existing large editor bundle produces a Vite chunk-size warning. Build success does not imply that a production deployment or external service has been verified.
