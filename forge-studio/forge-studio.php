<?php
/**
 * Plugin Name:       ForgeStudio
 * Plugin URI:        https://forgestudio.dev
 * Description:       Visual Elementor-like website builder plugin for WordPress, connecting WordPress sites to ForgeStudio.
 * Version:           1.0.0
 * Author:            ForgeStudio Team
 * Author URI:        https://forgestudio.dev
 * License:           GPL-2.0+
 * Text Domain:       forge-studio
 * Domain Path:       /languages
 */

// Prevent direct access to this file
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define Plugin Constants
define( 'FORGE_STUDIO_VERSION', '1.0.0' );
define( 'FORGE_STUDIO_PATH', plugin_dir_path( __FILE__ ) );
define( 'FORGE_STUDIO_URL', plugin_dir_url( __FILE__ ) );
define( 'FORGE_STUDIO_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Code executed during plugin activation.
 */
function activate_forge_studio() {
    require_once FORGE_STUDIO_PATH . 'includes/class-forgestudio-activator.php';
    ForgeStudio_Activator::activate();
}

/**
 * Code executed during plugin deactivation.
 */
function deactivate_forge_studio() {
    require_once FORGE_STUDIO_PATH . 'includes/class-forgestudio-activator.php';
    ForgeStudio_Activator::deactivate();
}

register_activation_hook( __FILE__, 'activate_forge_studio' );
register_deactivation_hook( __FILE__, 'deactivate_forge_studio' );

/**
 * Main plugin orchestration class.
 */
require_once FORGE_STUDIO_PATH . 'includes/class-forgestudio.php';

function run_forge_studio() {
    $plugin = new ForgeStudio();
    $plugin->run();
}
run_forge_studio();
