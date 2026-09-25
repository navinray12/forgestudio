<?php
/**
 * Plugin Name: ForgeStudio Connector
 * Plugin URI: https://forgestudio.io
 * Description: High-performance bridge connecting ForgeStudio SaaS visual editor with WordPress & Elementor.
 * Version: 1.0.0
 * Author: ForgeStudio Team
 * Author URI: https://forgestudio.io
 * License: GPL-2.0+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: forgestudio-connector
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit; // Prevent direct execution
}

class ForgeStudio_Connector {
    const VERSION = '1.0.0';
    const OPTION_API_KEY = 'forgestudio_api_key';
    const OPTION_WEBHOOK_SECRET = 'forgestudio_webhook_secret';
    const REST_NAMESPACE = 'forgestudio/v1';

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_filter('the_content', array($this, 'filter_page_content'));
        add_action('wp_head', array($this, 'inject_custom_css'));
    }

    /**
     * Register REST API endpoints under /wp-json/forgestudio/v1/
     */
    public function register_rest_routes() {
        // 1. Verification & status handshake endpoint
        register_rest_route(self::REST_NAMESPACE, '/verify', array(
            'methods'  => 'GET',
            'callback' => array($this, 'rest_verify_connection'),
            'permission_callback' => array($this, 'validate_api_key_permission'),
        ));

        // 2. Page Synchronization endpoint
        register_rest_route(self::REST_NAMESPACE, '/pages', array(
            array(
                'methods'  => 'GET',
                'callback' => array($this, 'rest_list_pages'),
                'permission_callback' => array($this, 'validate_api_key_permission'),
            ),
            array(
                'methods'  => 'POST',
                'callback' => array($this, 'rest_sync_page'),
                'permission_callback' => array($this, 'validate_api_key_permission'),
            ),
        ));

        // 3. Webhook receiver endpoint
        register_rest_route(self::REST_NAMESPACE, '/webhook', array(
            'methods'  => 'POST',
            'callback' => array($this, 'rest_handle_webhook'),
            'permission_callback' => array($this, 'validate_api_key_permission'),
        ));

        // 4. Navigation Menus endpoint (Module 10 / F-224)
        register_rest_route(self::REST_NAMESPACE, '/menus', array(
            'methods'             => 'GET',
            'callback'            => 'forgestudio_get_menus',
            'permission_callback' => 'forgestudio_verify_token',
        ));

        // 5. Custom Fields endpoint (ACF, Pods, Toolset Types) (Module 11 / F-262, F-263, F-264)
        register_rest_route(self::REST_NAMESPACE, '/custom-fields', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_get_custom_fields'),
            'permission_callback' => 'forgestudio_verify_token',
        ));

        // 6. Multisite Network Sites endpoint (Module 11 / F-269)
        register_rest_route(self::REST_NAMESPACE, '/multisite', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_get_multisite_sites'),
            'permission_callback' => 'forgestudio_verify_token',
        ));
    }

    /**
     * Validate ForgeStudio API Key from header or query param
     */
    public function validate_api_key_permission(WP_REST_Request $request) {
        $stored_key = get_option(self::OPTION_API_KEY);
        if (empty($stored_key)) {
            // Auto-generate a secure key if not yet initialized
            $stored_key = wp_generate_password(32, false);
            update_option(self::OPTION_API_KEY, $stored_key);
        }

        $provided_key = $request->get_header('x-forge-api-key');
        if (empty($provided_key)) {
            $provided_key = $request->get_param('api_key');
        }

        if (empty($provided_key)) {
            return new WP_Error('unauthorized', 'Missing X-Forge-Api-Key authentication header.', array('status' => 401));
        }

        // Compare using timing-attack safe comparison
        if (!hash_equals($stored_key, $provided_key) && !hash_equals(hash('sha256', $stored_key), $provided_key)) {
            return new WP_Error('forbidden', 'Invalid ForgeStudio API Key provided.', array('status' => 403));
        }

        return true;
    }

    /**
     * Endpoint handler: Verify connection
     */
    public function rest_verify_connection(WP_REST_Request $request) {
        return rest_ensure_response(array(
            'status'            => 'CONNECTED',
            'pluginVersion'     => self::VERSION,
            'wordpressVersion'  => get_bloginfo('version'),
            'phpVersion'        => PHP_VERSION,
            'siteName'          => get_bloginfo('name'),
            'siteUrl'           => site_url(),
            'elementorActive'   => did_action('elementor/loaded') ? true : false,
            'permalinkStructure'=> get_option('permalink_structure'),
            'timestamp'         => gmdate('Y-m-d\TH:i:s\Z'),
        ));
    }

    /**
     * Endpoint handler: List pages for mapping
     */
    public function rest_list_pages(WP_REST_Request $request) {
        $pages = get_posts(array(
            'post_type'      => 'page',
            'post_status'    => array('publish', 'draft'),
            'posts_per_page' => 100,
        ));

        $data = array();
        foreach ($pages as $p) {
            $data[] = array(
                'id'          => $p->ID,
                'title'       => $p->post_title,
                'slug'        => $p->post_name,
                'status'      => $p->post_status,
                'url'         => get_permalink($p->ID),
                'forgePageId' => get_post_meta($p->ID, '_forgestudio_page_id', true),
            );
        }

        return rest_ensure_response(array('pages' => $data));
    }

    /**
     * Endpoint handler: Sync / Update Page
     */
    public function rest_sync_page(WP_REST_Request $request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_params();
        }

        $forge_page_id    = sanitize_text_field($params['pageId'] ?? '');
        $title            = sanitize_text_field($params['title'] ?? 'ForgeStudio Page');
        $slug             = sanitize_title($params['slug'] ?? '');
        $content_html     = $params['contentHtml'] ?? '';
        $custom_css       = $params['customCss'] ?? '';
        $update_post_id   = isset($params['updatePostId']) ? intval($params['updatePostId']) : 0;
        $gutenberg_blocks = $params['gutenbergBlocks'] ?? '';

        // Prepare post payload
        $post_data = array(
            'post_title'   => $title,
            'post_name'    => $slug,
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_content' => !empty($gutenberg_blocks) ? $gutenberg_blocks : $content_html,
        );

        if ($update_post_id > 0 && get_post($update_post_id)) {
            $post_data['ID'] = $update_post_id;
            $post_id = wp_update_post($post_data, true);
        } else {
            // Check if page with forge_page_id already exists
            $existing_query = new WP_Query(array(
                'post_type'  => 'page',
                'meta_key'   => '_forgestudio_page_id',
                'meta_value' => $forge_page_id,
                'posts_per_page' => 1,
            ));

            if ($existing_query->have_posts()) {
                $post_data['ID'] = $existing_query->posts[0]->ID;
                $post_id = wp_update_post($post_data, true);
            } else {
                $post_id = wp_insert_post($post_data, true);
            }
        }

        if (is_wp_error($post_id)) {
            return new WP_Error('page_sync_failed', $post_id->get_error_message(), array('status' => 500));
        }

        // Store ForgeStudio tracking metadata
        update_post_meta($post_id, '_forgestudio_page_id', $forge_page_id);
        update_post_meta($post_id, '_forgestudio_html', $content_html);
        update_post_meta($post_id, '_forgestudio_css', $custom_css);
        update_post_meta($post_id, '_forgestudio_synced_at', current_time('mysql'));

        // If Elementor is active and elementorData provided, update Elementor meta
        if (!empty($params['elementorData'])) {
            $el_data_json = is_string($params['elementorData']) ? $params['elementorData'] : json_encode($params['elementorData']);
            update_post_meta($post_id, '_elementor_data', wp_slash($el_data_json));
            update_post_meta($post_id, '_elementor_edit_mode', 'builder');
            update_post_meta($post_id, '_elementor_template_type', 'wp-page');
            update_post_meta($post_id, '_elementor_version', '3.18.0');
        }

        // Yoast SEO Meta
        if (!empty($params['yoastMeta'])) {
            $ym = $params['yoastMeta'];
            if (!empty($ym['focuskw'])) update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($ym['focuskw']));
            if (!empty($ym['title'])) update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($ym['title']));
            if (!empty($ym['metadesc'])) update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($ym['metadesc']));
        }

        // RankMath Meta
        if (!empty($params['rankMathMeta'])) {
            $rm = $params['rankMathMeta'];
            if (!empty($rm['title'])) update_post_meta($post_id, 'rank_math_title', sanitize_text_field($rm['title']));
            if (!empty($rm['description'])) update_post_meta($post_id, 'rank_math_description', sanitize_textarea_field($rm['description']));
            if (!empty($rm['focusKeyword'])) update_post_meta($post_id, 'rank_math_focus_keyword', sanitize_text_field($rm['focusKeyword']));
        }

        return rest_ensure_response(array(
            'success'  => true,
            'postId'   => $post_id,
            'postUrl'  => get_permalink($post_id),
            'syncedAt' => current_time('mysql'),
        ));
    }

    /**
     * Endpoint handler: Webhook actions
     */
    public function rest_handle_webhook(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $event  = sanitize_text_field($params['event'] ?? 'ping');

        return rest_ensure_response(array(
            'success' => true,
            'event'   => $event,
            'received'=> true,
        ));
    }

    /**
     * Endpoint handler: Retrieve registered Custom Fields (ACF, Pods, Toolset Types) (F-262 - F-264)
     */
    public function rest_get_custom_fields(WP_REST_Request $request) {
        $acf_groups = array();
        $pods_types = array();
        $toolset_fields = array();

        // 1. ACF (Advanced Custom Fields)
        if (function_exists('acf_get_field_groups')) {
            $groups = acf_get_field_groups();
            if (is_array($groups)) {
                foreach ($groups as $group) {
                    $fields = function_exists('acf_get_fields') ? acf_get_fields($group['key']) : array();
                    $field_items = array();
                    if (is_array($fields)) {
                        foreach ($fields as $f) {
                            $field_items[] = array(
                                'key'   => $f['key'] ?? '',
                                'name'  => $f['name'] ?? '',
                                'label' => $f['label'] ?? '',
                                'type'  => $f['type'] ?? 'text',
                            );
                        }
                    }
                    $acf_groups[] = array(
                        'id'     => $group['ID'] ?? $group['key'],
                        'key'    => $group['key'],
                        'title'  => $group['title'],
                        'fields' => $field_items,
                    );
                }
            }
        }

        // 2. Pods Framework
        if (function_exists('pods_api')) {
            $api = pods_api();
            if (is_object($api) && method_exists($api, 'load_pods')) {
                $all_pods = $api->load_pods();
                if (is_array($all_pods)) {
                    foreach ($all_pods as $pod) {
                        $p_fields = array();
                        if (!empty($pod['fields']) && is_array($pod['fields'])) {
                            foreach ($pod['fields'] as $fname => $fdata) {
                                $p_fields[] = array(
                                    'name'  => $fname,
                                    'label' => $fdata['label'] ?? $fname,
                                    'type'  => $fdata['type'] ?? 'text',
                                );
                            }
                        }
                        $pods_types[] = array(
                            'name'   => $pod['name'] ?? '',
                            'label'  => $pod['label'] ?? '',
                            'type'   => $pod['type'] ?? 'post_type',
                            'fields' => $p_fields,
                        );
                    }
                }
            }
        }

        // 3. Toolset Types
        if (function_exists('wpcf_admin_fields_get_fields')) {
            $raw_toolset = wpcf_admin_fields_get_fields();
            if (is_array($raw_toolset)) {
                foreach ($raw_toolset as $t_slug => $t_data) {
                    $toolset_fields[] = array(
                        'slug'  => $t_slug,
                        'name'  => $t_data['name'] ?? $t_slug,
                        'type'  => $t_data['type'] ?? 'textfield',
                        'meta'  => 'wpcf-' . $t_slug,
                    );
                }
            }
        }

        return rest_ensure_response(array(
            'status'     => 'success',
            'acf'        => $acf_groups,
            'pods'       => $pods_types,
            'toolset'    => $toolset_fields,
            'discovered' => array(
                'acfActive'     => function_exists('acf_get_field_groups'),
                'podsActive'    => function_exists('pods_api'),
                'toolsetActive' => function_exists('wpcf_admin_fields_get_fields'),
            ),
        ));
    }

    /**
     * Endpoint handler: Retrieve WordPress Multisite Network Sites (F-269)
     */
    public function rest_get_multisite_sites(WP_REST_Request $request) {
        $is_ms = is_multisite();
        $sites_list = array();

        if ($is_ms && function_exists('get_sites')) {
            $network_sites = get_sites(array('number' => 100));
            if (is_array($network_sites)) {
                foreach ($network_sites as $s) {
                    $details = get_blog_details($s->blog_id);
                    $sites_list[] = array(
                        'id'        => (string)$s->blog_id,
                        'name'      => $details ? $details->blogname : "Site " . $s->blog_id,
                        'domain'    => $s->domain,
                        'path'      => $s->path,
                        'isMain'    => (string)$s->blog_id === "1",
                        'siteUrl'   => get_site_url($s->blog_id),
                    );
                }
            }
        } else {
            // Single-site fallback
            $sites_list[] = array(
                'id'      => '1',
                'name'    => get_bloginfo('name'),
                'domain'  => parse_url(site_url(), PHP_URL_HOST) ?: 'localhost',
                'path'    => parse_url(site_url(), PHP_URL_PATH) ?: '/',
                'isMain'  => true,
                'siteUrl' => site_url(),
            );
        }

        return rest_ensure_response(array(
            'status'      => 'success',
            'isMultisite' => $is_ms,
            'sites'       => $sites_list,
            'currentSite' => get_current_blog_id(),
        ));
    }

    /**
     * Injects custom CSS generated by ForgeStudio into wp_head
     */
    public function inject_custom_css() {
        if (!is_singular('page')) return;
        $post_id = get_the_ID();
        $css = get_post_meta($post_id, '_forgestudio_css', true);
        if (!empty($css)) {
            echo "\n<!-- ForgeStudio Injected Styles -->\n";
            echo "<style id=\"forgestudio-page-styles\">\n" . wp_strip_all_tags($css) . "\n</style>\n";
        }
    }

    /**
     * Content filter for rendering clean ForgeStudio HTML
     */
    public function filter_page_content($content) {
        if (!is_singular('page') || is_admin()) return $content;
        $post_id = get_the_ID();
        $forge_html = get_post_meta($post_id, '_forgestudio_html', true);
        if (!empty($forge_html)) {
            return $forge_html;
        }
        return $content;
    }

    /**
     * Register Admin Settings Menu
     */
    public function register_admin_menu() {
        add_options_page(
            'ForgeStudio Connector',
            'ForgeStudio',
            'manage_options',
            'forgestudio-connector',
            array($this, 'render_admin_page')
        );
    }

    public function register_settings() {
        register_setting('forgestudio_settings', self::OPTION_API_KEY);
    }

    public function render_admin_page() {
        if (!current_user_can('manage_options')) return;
        $api_key = get_option(self::OPTION_API_KEY);
        if (empty($api_key)) {
            $api_key = wp_generate_password(32, false);
            update_option(self::OPTION_API_KEY, $api_key);
        }
        ?>
        <div class="wrap">
            <h1>ForgeStudio Connector Settings</h1>
            <p>Connect your WordPress website to ForgeStudio SaaS to publish high-performance visual pages directly.</p>
            <table class="form-table">
                <tr>
                    <th scope="row">Connection Status</th>
                    <td><span style="color:#10b981;font-weight:bold;">● Ready for Connection</span></td>
                </tr>
                <tr>
                    <th scope="row">WordPress Site URL</th>
                    <td><code><?php echo esc_html(site_url()); ?></code></td>
                </tr>
                <tr>
                    <th scope="row">ForgeStudio API Key</th>
                    <td>
                        <input type="text" readonly value="<?php echo esc_attr($api_key); ?>" style="width:360px;font-family:monospace;" />
                        <p class="description">Copy and paste this key into your ForgeStudio Publishing Destination settings.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">REST API Endpoint</th>
                    <td><code><?php echo esc_html(rest_url(self::REST_NAMESPACE . '/verify')); ?></code></td>
                </tr>
            </table>
        </div>
        <?php
    }

    /**
     * Endpoint handler wrapper for ForgeStudio Connector instance
     */
    public function rest_get_menus(WP_REST_Request $request) {
        return forgestudio_get_menus($request);
    }
}

/**
 * Builds hierarchical tree from flat nav menu items
 */
function forgestudio_build_menu_tree($items) {
    if (empty($items) || !is_array($items)) {
        return array();
    }

    $items_by_id = array();
    $tree = array();

    foreach ($items as $item) {
        $item_id = is_object($item) ? intval($item->ID) : (is_array($item) ? intval($item['ID'] ?? $item['id'] ?? 0) : 0);
        if (!$item_id) {
            continue;
        }

        $parent_id = 0;
        $title = '';
        $url = '';
        $target = '_self';
        $order = 0;

        if (is_object($item)) {
            $parent_id = isset($item->menu_item_parent) ? intval($item->menu_item_parent) : (isset($item->post_parent) ? intval($item->post_parent) : 0);
            $title = !empty($item->title) ? $item->title : (!empty($item->post_title) ? $item->post_title : '');
            $url = isset($item->url) ? $item->url : (function_exists('get_post_meta') ? (get_post_meta($item->ID, '_menu_item_url', true) ?: '') : '');
            $raw_target = isset($item->target) ? $item->target : (function_exists('get_post_meta') ? (get_post_meta($item->ID, '_menu_item_target', true) ?: '_self') : '_self');
            $target = !empty($raw_target) ? $raw_target : '_self';
            $order = isset($item->menu_order) ? intval($item->menu_order) : 0;
        } elseif (is_array($item)) {
            $parent_id = isset($item['menu_item_parent']) ? intval($item['menu_item_parent']) : (isset($item['parent_id']) ? intval($item['parent_id']) : 0);
            $title = $item['title'] ?? $item['post_title'] ?? '';
            $url = $item['url'] ?? '';
            $target = !empty($item['target']) ? $item['target'] : '_self';
            $order = isset($item['menu_order']) ? intval($item['menu_order']) : (isset($item['order']) ? intval($item['order']) : 0);
        }

        $items_by_id[$item_id] = array(
            'id'        => $item_id,
            'title'     => $title,
            'url'       => $url,
            'target'    => $target,
            'parent_id' => $parent_id,
            'order'     => $order,
            'children'  => array(),
        );
    }

    foreach ($items_by_id as $id => &$node) {
        $pid = $node['parent_id'];
        if ($pid > 0 && isset($items_by_id[$pid])) {
            $items_by_id[$pid]['children'][] = &$node;
        } else {
            $tree[] = &$node;
        }
    }
    unset($node);

    return $tree;
}

/**
 * REST Endpoint handler: Fetch registered WordPress menus with hierarchical item trees and theme locations
 */
function forgestudio_get_menus($request = null) {
    $menus_data = array();
    $raw_menus = function_exists('wp_get_nav_menus') ? wp_get_nav_menus() : array();

    if (!empty($raw_menus) && is_array($raw_menus)) {
        foreach ($raw_menus as $menu) {
            $term_id = is_object($menu) ? $menu->term_id : (is_array($menu) ? ($menu['term_id'] ?? $menu['id'] ?? 0) : 0);
            $name    = is_object($menu) ? $menu->name : (is_array($menu) ? ($menu['name'] ?? '') : '');
            $slug    = is_object($menu) ? $menu->slug : (is_array($menu) ? ($menu['slug'] ?? '') : '');
            $count   = is_object($menu) ? intval($menu->count) : (is_array($menu) ? intval($menu['count'] ?? 0) : 0);

            $raw_items = function_exists('wp_get_nav_menu_items') ? wp_get_nav_menu_items($term_id) : array();
            $tree = forgestudio_build_menu_tree($raw_items);

            $menus_data[] = array(
                'id'       => $term_id,
                'name'     => $name,
                'slug'     => $slug,
                'count'    => $count,
                'items'    => $tree,
            );
        }
    }

    $locations = function_exists('get_nav_menu_locations') ? get_nav_menu_locations() : array();

    $response = array(
        'status'    => 'success',
        'menus'     => $menus_data,
        'locations' => $locations,
    );

    if (function_exists('rest_ensure_response')) {
        return rest_ensure_response($response);
    }
    return $response;
}

/**
 * Permission callback: Validate token / API key
 */
function forgestudio_verify_token($request) {
    if (class_exists('ForgeStudio_Connector')) {
        $instance = ForgeStudio_Connector::get_instance();
        if (method_exists($instance, 'validate_api_key_permission')) {
            $check = $instance->validate_api_key_permission($request);
            if ($check === true) {
                return true;
            }
        }
    }

    $stored_key = function_exists('get_option') ? get_option('forgestudio_api_key') : null;
    $provided_key = is_object($request) && method_exists($request, 'get_header')
        ? ($request->get_header('x-forge-api-key') ?: $request->get_header('x-forgestudio-token') ?: $request->get_param('api_key'))
        : null;

    if ($stored_key && $provided_key) {
        $clean_token = str_replace('Bearer ', '', trim($provided_key));
        if (hash_equals($stored_key, $clean_token) || hash_equals(hash('sha256', $stored_key), $clean_token)) {
            return true;
        }
    }

    if (function_exists('current_user_can') && (current_user_can('manage_options') || current_user_can('edit_theme_options'))) {
        return true;
    }

    if (function_exists('forgestudio_rest_permission_check')) {
        return forgestudio_rest_permission_check($request);
    }

    if (function_exists('is_wp_error')) {
        return new WP_Error('unauthorized', 'Missing or invalid authentication token for ForgeStudio.', array('status' => 401));
    }
    return false;
}

// Initialize the plugin singleton
ForgeStudio_Connector::get_instance();

