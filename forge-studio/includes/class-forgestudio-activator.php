<?php
/**
 * Fired during plugin activation and deactivation.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ForgeStudio_Activator {

    /**
     * Activate the plugin:
     * - Create default options if not exists
     * - Flush rewrite rules
     */
    public static function activate() {
        if ( false === get_option( 'forgestudio_connection_status' ) ) {
            add_option( 'forgestudio_connection_status', 'not_connected' );
        }
        if ( false === get_option( 'forgestudio_api_key' ) ) {
            add_option( 'forgestudio_api_key', '' );
        }
        if ( false === get_option( 'forgestudio_app_url' ) ) {
            add_option( 'forgestudio_app_url', '' );
        }

        flush_rewrite_rules();
    }

    /**
     * Deactivate the plugin:
     * - Flush rewrite rules
     * Note: Preserves options so user configuration is not lost on temporary deactivation.
     */
    public static function deactivate() {
        flush_rewrite_rules();
    }
}
