<?php
/**
 * Admin functionality for ForgeStudio WordPress plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ForgeStudio_Admin {

    private $version;

    public function __construct( $version ) {
        $this->version = $version;
    }

    /**
     * Register Admin Menu item in WordPress dashboard.
     */
    public function add_admin_menu() {
        add_menu_page(
            'ForgeStudio',                  // Page title
            'ForgeStudio',                  // Menu title
            'manage_options',               // Capability required
            'forgestudio',                  // Menu slug
            array( $this, 'display_admin_page' ), // Callback function
            'dashicons-layout',            // Icon
            30                              // Position
        );
    }

    /**
     * Register settings in WP Admin.
     */
    public function register_settings() {
        register_setting( 'forgestudio_options_group', 'forgestudio_connection_status', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'not_connected',
        ) );
        register_setting( 'forgestudio_options_group', 'forgestudio_api_key', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ) );
        register_setting( 'forgestudio_options_group', 'forgestudio_app_url', array(
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => '',
        ) );
    }

    /**
     * Render the admin screen.
     */
    public function display_admin_page() {
        require_once FORGE_STUDIO_PATH . 'admin/views/admin-display.php';
    }
}
