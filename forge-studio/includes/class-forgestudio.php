<?php
/**
 * Core plugin class of ForgeStudio.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ForgeStudio {

    protected $version;

    public function __construct() {
        $this->version = FORGE_STUDIO_VERSION;
    }

    /**
     * Run the plugin: register hooks and modules.
     */
    public function run() {
        $this->define_admin_hooks();
        $this->define_rest_api_hooks();
        $this->define_frontend_renderer_hooks();
    }

    /**
     * Register all admin-related hooks.
     */
    private function define_admin_hooks() {
        require_once FORGE_STUDIO_PATH . 'includes/class-forgestudio-admin.php';
        $plugin_admin = new ForgeStudio_Admin( $this->version );

        add_action( 'admin_menu', array( $plugin_admin, 'add_admin_menu' ) );
        add_action( 'admin_init', array( $plugin_admin, 'register_settings' ) );
    }

    /**
     * Register REST API routes hook.
     */
    private function define_rest_api_hooks() {
        require_once FORGE_STUDIO_PATH . 'includes/class-forgestudio-rest-api.php';
        $plugin_rest_api = new ForgeStudio_REST_API();

        add_action( 'rest_api_init', array( $plugin_rest_api, 'register_routes' ) );
    }

    /**
     * Register frontend page content renderer filter.
     */
    private function define_frontend_renderer_hooks() {
        require_once FORGE_STUDIO_PATH . 'renderer/class-forgestudio-renderer.php';

        add_filter( 'the_content', array( $this, 'render_page_content' ) );
    }

    /**
     * Render ForgeStudio document if saved for current page.
     */
    public function render_page_content( $content ) {
        if ( ! is_singular( 'page' ) && ! is_page() ) {
            return $content;
        }

        $post_id = get_the_ID();
        if ( ! $post_id ) {
            return $content;
        }

        $forgestudio_doc = get_post_meta( $post_id, '_forgestudio_document', true );
        if ( ! empty( $forgestudio_doc ) ) {
            $rendered_html = ForgeStudio_Renderer::render_document( $forgestudio_doc );
            if ( ! empty( $rendered_html ) ) {
                return $rendered_html;
            }
        }

        return $content;
    }

    public function get_version() {
        return $this->version;
    }
}
