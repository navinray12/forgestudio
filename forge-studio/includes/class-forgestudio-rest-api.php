<?php
/**
 * REST API functionality for ForgeStudio WordPress plugin.
 * Namespace: forgestudio/v1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ForgeStudio_REST_API {

    private $namespace = 'forgestudio/v1';

    /**
     * Register REST API routes.
     */
    public function register_routes() {
        // GET /wp-json/forgestudio/v1/test
        register_rest_route(
            $this->namespace,
            '/test',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( $this, 'get_test' ),
                'permission_callback' => '__return_true', // Public connectivity check test endpoint
            )
        );

        // GET /wp-json/forgestudio/v1/status
        register_rest_route(
            $this->namespace,
            '/status',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( $this, 'get_status' ),
                'permission_callback' => array( $this, 'verify_api_permission' ),
            )
        );

        // GET /wp-json/forgestudio/v1/media
        register_rest_route(
            $this->namespace,
            '/media',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( $this, 'get_media' ),
                'permission_callback' => array( $this, 'verify_api_permission' ),
            )
        );

        // GET /wp-json/forgestudio/v1/menus
        register_rest_route(
            $this->namespace,
            '/menus',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( $this, 'get_menus' ),
                'permission_callback' => array( $this, 'verify_api_permission' ),
            )
        );

        // GET /wp-json/forgestudio/v1/menus/{id}
        register_rest_route(
            $this->namespace,
            '/menus/(?P<id>\d+)',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( $this, 'get_menu' ),
                'permission_callback' => array( $this, 'verify_api_permission' ),
            )
        );

        // PUT /wp-json/forgestudio/v1/menus/{id}
        register_rest_route(
            $this->namespace,
            '/menus/(?P<id>\d+)',
            array(
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => array( $this, 'update_menu' ),
                'permission_callback' => array( $this, 'verify_api_permission' ),
            )
        );
    }

    /**
     * Callback for GET /test
     */
    public function get_test( WP_REST_Request $request ) {
        return new WP_REST_Response(
            array(
                'success' => true,
                'plugin'  => 'ForgeStudio',
                'version' => FORGE_STUDIO_VERSION,
            ),
            200
        );
    }

    /**
     * Callback for GET /status
     */
    public function get_status( WP_REST_Request $request ) {
        $connection_status = get_option( 'forgestudio_connection_status', 'not_connected' );
        $app_url           = get_option( 'forgestudio_app_url', '' );

        return new WP_REST_Response(
            array(
                'success'           => true,
                'plugin'            => 'ForgeStudio',
                'version'           => FORGE_STUDIO_VERSION,
                'wordpressVersion'  => get_bloginfo( 'version' ),
                'siteName'          => get_bloginfo( 'name' ),
                'siteUrl'           => get_site_url(),
                'connectionStatus' => $connection_status,
                'appUrl'            => $app_url,
                'apiAvailable'      => true,
            ),
            200
        );
    }

    /**
     * Callback for GET /media
     */
    public function get_media( WP_REST_Request $request ) {
        $page     = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
        $per_page = min( 100, max( 1, intval( $request->get_param( 'per_page' ) ?: 20 ) ) );
        $search   = sanitize_text_field( $request->get_param( 'search' ) ?: '' );

        $query_args = array(
            'post_type'      => 'attachment',
            'post_status'    => 'inherit',
            'post_mime_type' => 'image',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            's'              => $search,
            'orderby'        => 'date',
            'order'          => 'DESC',
        );

        $query = new WP_Query( $query_args );
        $items = array();

        if ( $query->have_posts() ) {
            foreach ( $query->posts as $post ) {
                $url          = wp_get_attachment_url( $post->ID );
                $thumb_src    = wp_get_attachment_image_src( $post->ID, 'thumbnail' );
                $thumb_url    = $thumb_src ? $thumb_src[0] : $url;
                $alt          = get_post_meta( $post->ID, '_wp_attachment_image_alt', true );
                $meta         = wp_get_attachment_metadata( $post->ID );
                $width        = isset( $meta['width'] ) ? intval( $meta['width'] ) : 0;
                $height       = isset( $meta['height'] ) ? intval( $meta['height'] ) : 0;

                $items[] = array(
                    'id'           => $post->ID,
                    'url'          => $url,
                    'thumbnailUrl' => $thumb_url,
                    'title'        => get_the_title( $post->ID ),
                    'alt'          => $alt ? $alt : get_the_title( $post->ID ),
                    'mimeType'     => get_post_mime_type( $post->ID ),
                    'width'        => $width,
                    'height'       => $height,
                );
            }
        }

        return new WP_REST_Response(
            array(
                'success' => true,
                'items'   => $items,
                'page'    => $page,
                'perPage' => $per_page,
                'total'   => intval( $query->found_posts ),
            ),
            200
        );
    }

    /**
     * Callback for GET /menus
     */
    public function get_menus( WP_REST_Request $request ) {
        $nav_menus = wp_get_nav_menus();
        $menus     = array();

        if ( ! empty( $nav_menus ) && ! is_wp_error( $nav_menus ) ) {
            foreach ( $nav_menus as $menu ) {
                $menus[] = array(
                    'id'    => $menu->term_id,
                    'name'  => $menu->name,
                    'slug'  => $menu->slug,
                    'count' => intval( $menu->count ),
                );
            }
        }

        return new WP_REST_Response(
            array(
                'success' => true,
                'menus'   => $menus,
            ),
            200
        );
    }

    /**
     * Callback for GET /menus/{id}
     */
    public function get_menu( WP_REST_Request $request ) {
        $menu_id    = intval( $request->get_param( 'id' ) );
        $menu_items = wp_get_nav_menu_items( $menu_id );
        $items      = array();

        if ( ! empty( $menu_items ) && ! is_wp_error( $menu_items ) ) {
            foreach ( $menu_items as $item ) {
                $parent_id = intval( $item->menu_item_parent );
                $items[]   = array(
                    'id'       => intval( $item->ID ),
                    'title'    => $item->title,
                    'url'      => $item->url,
                    'parentId' => $parent_id > 0 ? $parent_id : null,
                    'order'    => intval( $item->menu_order ),
                    'target'   => $item->target ? $item->target : '_self',
                );
            }
        }

        $term = get_term( $menu_id, 'nav_menu' );
        $name = ( $term && ! is_wp_error( $term ) ) ? $term->name : "Menu #{$menu_id}";

        return new WP_REST_Response(
            array(
                'success' => true,
                'menu'    => array(
                    'id'    => $menu_id,
                    'name'  => $name,
                    'items' => $items,
                ),
            ),
            200
        );
    }

    /**
     * Callback for PUT /menus/{id}
     */
    public function update_menu( WP_REST_Request $request ) {
        $menu_id = intval( $request->get_param( 'id' ) );
        $items   = $request->get_param( 'items' );

        if ( ! is_array( $items ) ) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'message' => 'Invalid items array provided.',
                ),
                400
            );
        }

        foreach ( $items as $item ) {
            if ( empty( $item['id'] ) ) {
                continue;
            }

            $db_id = intval( $item['id'] );
            $args  = array(
                'menu-item-position'  => isset( $item['order'] ) ? intval( $item['order'] ) : 0,
                'menu-item-parent-id' => ! empty( $item['parentId'] ) ? intval( $item['parentId'] ) : 0,
            );

            if ( isset( $item['title'] ) ) {
                $args['menu-item-title'] = sanitize_text_field( $item['title'] );
            }
            if ( isset( $item['url'] ) ) {
                $args['menu-item-url'] = esc_url_raw( $item['url'] );
            }

            wp_update_nav_menu_item( $menu_id, $db_id, $args );
        }

        return new WP_REST_Response(
            array(
                'success' => true,
                'message' => 'WordPress Menu updated successfully.',
            ),
            200
        );
    }

    /**
     * Verify API key or user permissions.
     */
    public function verify_api_permission( WP_REST_Request $request ) {
        // Allow logged in users with manage_options capability
        if ( current_user_can( 'manage_options' ) ) {
            return true;
        }

        // Validate X-ForgeStudio-Api-Key header if provided
        $provided_key = $request->get_header( 'x_forgestudio_api_key' );
        if ( empty( $provided_key ) ) {
            $provided_key = $request->get_header( 'x-forgestudio-api-key' );
        }

        $stored_key = get_option( 'forgestudio_api_key', '' );
        if ( ! empty( $stored_key ) && ! empty( $provided_key ) ) {
            return hash_equals( $stored_key, $provided_key );
        }

        return new WP_Error(
            'rest_forbidden',
            __( 'Unauthorized API request. Valid API key or admin authorization required.', 'forge-studio' ),
            array( 'status' => 401 )
        );
    }
}
