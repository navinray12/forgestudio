<?php
/**
 * IDE Stub definitions for WordPress Core functions, classes, and constants.
 * This file provides type hints and declarations for IDE linters when developing outside a live WordPress environment.
 */

if (!defined('ABSPATH')) {
    define('ABSPATH', dirname(__FILE__) . '/');
}

if (!defined('OBJECT')) {
    define('OBJECT', 'OBJECT');
}

if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {
        public function get_header($name) { return ''; }
        public function get_param($name) { return null; }
        public function get_json_params() { return []; }
        public function get_body_params() { return []; }
        public function get_body() { return ''; }
    }
}

if (!class_exists('WP_Error')) {
    class WP_Error {
        public function __construct($code = '', $message = '', $data = '') {}
        public function get_error_message() { return ''; }
    }
}

if (!class_exists('WP_Theme')) {
    class WP_Theme {
        public function get($name) { return ''; }
        public function is_block_theme() { return false; }
        public function parent() { return null; }
    }
}

if (!class_exists('WP_Query')) {
    class WP_Query {
        public $found_posts = 0;
        public $max_num_pages = 0;
        public $posts = [];
        public function __construct($args = []) {}
        public function have_posts() { return false; }
    }
}

if (!class_exists('WP_Post')) {
    class WP_Post {
        public $ID = 0;
        public $post_title = '';
        public $post_name = '';
        public $post_content = '';
        public $post_excerpt = '';
        public $post_status = '';
        public $post_type = '';
        public $post_author = 0;
        public $post_parent = 0;
        public $menu_order = 0;
    }
}

if (!class_exists('ACF')) {
    class ACF {}
}

// WordPress Functions Stubs
if (!function_exists('add_option')) { function add_option($option, $value = '', $deprecated = '', $autoload = 'yes') { return true; } }
if (!function_exists('get_option')) { function get_option($option, $default = false) { return $default; } }
if (!function_exists('update_option')) { function update_option($option, $value, $autoload = null) { return true; } }
if (!function_exists('delete_option')) { function delete_option($option) { return true; } }

if (!function_exists('register_activation_hook')) { function register_activation_hook($file, $function) {} }
if (!function_exists('register_deactivation_hook')) { function register_deactivation_hook($file, $function) {} }

if (!function_exists('add_action')) { function add_action($hook_name, $callback, $priority = 10, $accepted_args = 1) {} }
if (!function_exists('add_options_page')) { function add_options_page($page_title, $menu_title, $capability, $menu_slug, $callback = '', $position = null) {} }

if (!function_exists('register_rest_route')) { function register_rest_route($namespace, $route, $args = [], $override = false) { return true; } }
if (!function_exists('rest_ensure_response')) { function rest_ensure_response($response) { return $response; } }

if (!function_exists('current_user_can')) { function current_user_can($capability, ...$args) { return true; } }
if (!function_exists('current_time')) { function current_time($type, $gmt = 0) { return date('Y-m-d H:i:s'); } }

if (!function_exists('get_bloginfo')) { function get_bloginfo($show = '', $filter = 'raw') { return ''; } }
if (!function_exists('get_site_url')) { function get_site_url($blog_id = null, $path = '', $scheme = null) { return ''; } }
if (!function_exists('get_home_url')) { function get_home_url($blog_id = null, $path = '', $scheme = null) { return ''; } }
if (!function_exists('get_locale')) { function get_locale() { return 'en_US'; } }
if (!function_exists('is_ssl')) { function is_ssl() { return false; } }

if (!function_exists('post_type_exists')) { function post_type_exists($post_type) { return true; } }
if (!function_exists('current_theme_supports')) { function current_theme_supports($feature, ...$args) { return true; } }
if (!function_exists('wp_get_theme')) { function wp_get_theme($stylesheet = null, $theme_root = null) { return new WP_Theme(); } }
if (!function_exists('wp_is_block_theme')) { function wp_is_block_theme() { return false; } }

if (!function_exists('sanitize_text_field')) { function sanitize_text_field($str) { return (string) $str; } }
if (!function_exists('sanitize_title')) { function sanitize_title($title, $fallback_title = '', $context = 'save') { return (string) $title; } }
if (!function_exists('sanitize_file_name')) { function sanitize_file_name($name) { return (string) $name; } }
if (!function_exists('wp_kses_post')) { function wp_kses_post($content) { return (string) $content; } }
if (!function_exists('esc_url_raw')) { function esc_url_raw($url, $protocols = null) { return (string) $url; } }
if (!function_exists('esc_html')) { function esc_html($text) { return (string) $text; } }

if (!function_exists('get_post')) { function get_post($post = null, $output = OBJECT, $filter = 'raw') { return new WP_Post(); } }
if (!function_exists('wp_update_post')) { function wp_update_post($postarr = [], $wp_error = false, $fire_after_hooks = true) { return 1; } }
if (!function_exists('get_page_by_path')) { function get_page_by_path($page_path, $output = OBJECT, $post_type = 'page') { return null; } }
if (!function_exists('wp_insert_post')) { function wp_insert_post($postarr, $wp_error = false, $fire_after_hooks = true) { return 1; } }
if (!function_exists('is_wp_error')) { function is_wp_error($thing) { return $thing instanceof WP_Error; } }
if (!function_exists('update_post_meta')) { function update_post_meta($post_id, $meta_key, $meta_value, $prev_value = '') { return true; } }
if (!function_exists('get_post_meta')) { function get_post_meta($post_id, $key = '', $single = false) { return ''; } }
if (!function_exists('get_permalink')) { function get_permalink($post = 0, $leavename = false) { return ''; } }
if (!function_exists('get_post_field')) { function get_post_field($field, $post = null, $context = 'display') { return ''; } }
if (!function_exists('get_the_date')) { function get_the_date($format = '', $post = null) { return ''; } }
if (!function_exists('get_the_modified_date')) { function get_the_modified_date($format = '', $post = null) { return ''; } }
if (!function_exists('wp_delete_post')) { function wp_delete_post($postid = 0, $force_delete = false) { return new WP_Post(); } }
if (!function_exists('wp_trash_post')) { function wp_trash_post($post_id = 0) { return new WP_Post(); } }

if (!function_exists('wp_upload_bits')) { function wp_upload_bits($name, $deprecated, $bits, $time = null) { return ['file' => '', 'url' => '', 'error' => false]; } }
if (!function_exists('wp_check_filetype')) { function wp_check_filetype($filename, $mimes = null) { return ['ext' => '', 'type' => '']; } }
if (!function_exists('wp_insert_attachment')) { function wp_insert_attachment($attachment, $filename = false, $parent_post_id = 0, $wp_error = false, $stop_repetitive_field_updates = false) { return 1; } }
if (!function_exists('wp_generate_attachment_metadata')) { function wp_generate_attachment_metadata($attachment_id, $file) { return []; } }
if (!function_exists('wp_update_attachment_metadata')) { function wp_update_attachment_metadata($post_id, $data) { return true; } }
if (!function_exists('get_attached_file')) { function get_attached_file($attachment_id, $unfiltered = false) { return ''; } }
if (!function_exists('wp_get_attachment_url')) { function wp_get_attachment_url($attachment_id = 0) { return ''; } }
if (!function_exists('wp_get_attachment_metadata')) { function wp_get_attachment_metadata($attachment_id = 0, $unfiltered = false) { return []; } }
if (!function_exists('wp_delete_attachment')) { function wp_delete_attachment($post_id, $force_delete = false) { return new WP_Post(); } }

if (!function_exists('wp_remote_post')) { function wp_remote_post($url, $args = []) { return []; } }
if (!function_exists('wp_handle_upload')) { function wp_handle_upload(&$file, $overrides = false, $time = null) { return []; } }
if (!function_exists('wp_get_nav_menus')) { function wp_get_nav_menus($args = []) { return []; } }
if (!function_exists('acf_add_local_field_group')) { function acf_add_local_field_group($field_group) {} }
if (!function_exists('is_multisite')) { function is_multisite() { return false; } }
if (!function_exists('parse_blocks')) { function parse_blocks($content) { return []; } }
if (!function_exists('register_block_type')) { function register_block_type($name, $args = []) { return false; } }
