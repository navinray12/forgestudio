<?php
/**
 * Admin view template for ForgeStudio WordPress Plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$status  = get_option( 'forgestudio_connection_status', 'not_connected' );
$api_key = get_option( 'forgestudio_api_key', '' );
$app_url = get_option( 'forgestudio_app_url', '' );

$is_connected = ( 'connected' === $status );
?>
<div class="wrap forgestudio-admin-wrap" style="max-w: 800px; margin-top: 20px;">
    <div style="background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">⚡</span>
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">ForgeStudio</h1>
            </div>
            <span style="background: #1e293b; color: #94a3b8; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">v<?php echo esc_html( FORGE_STUDIO_VERSION ); ?></span>
        </div>

        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <h3 style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 8px;">Connection Status</h3>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="height: 12px; width: 12px; border-radius: 50%; display: inline-block; background: <?php echo $is_connected ? '#10b981' : '#ef4444'; ?>;"></span>
                <span style="font-size: 18px; font-weight: 700; color: #ffffff;">
                    <?php echo $is_connected ? 'Connected' : 'Not Connected'; ?>
                </span>
            </div>

            <?php if ( $is_connected ) : ?>
                <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
                    Your WordPress site is connected to ForgeStudio app at <code><?php echo esc_url( $app_url ); ?></code>.
                </p>
            <?php else : ?>
                <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
                    Connect your WordPress installation to ForgeStudio editor to edit pages visually.
                </p>
            <?php endif; ?>
        </div>

        <form method="post" action="options.php">
            <?php
            settings_fields( 'forgestudio_options_group' );
            do_settings_sections( 'forgestudio_options_group' );
            ?>
            <div style="display: grid; gap: 16px; margin-bottom: 24px;">
                <div>
                    <label style="display: block; color: #cbd5e1; font-size: 13px; font-weight: 600; margin-bottom: 6px;">ForgeStudio App URL</label>
                    <input type="url" name="forgestudio_app_url" value="<?php echo esc_attr( $app_url ); ?>" placeholder="e.g. http://localhost:5173 or https://app.forgestudio.dev" style="width: 100%; background: #0f172a; border: 1px solid #475569; color: #ffffff; border-radius: 6px; padding: 10px; font-size: 14px;" />
                </div>

                <div>
                    <label style="display: block; color: #cbd5e1; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Connector Secret API Key</label>
                    <input type="password" name="forgestudio_api_key" value="<?php echo esc_attr( $api_key ); ?>" placeholder="Paste secret API key generated in ForgeStudio Settings" style="width: 100%; background: #0f172a; border: 1px solid #475569; color: #ffffff; border-radius: 6px; padding: 10px; font-size: 14px;" />
                </div>

                <input type="hidden" name="forgestudio_connection_status" value="<?php echo $api_key ? 'connected' : 'not_connected'; ?>" />
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
                <button type="submit" style="background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s;">
                    <?php echo $is_connected ? 'Update Connection' : 'Connect ForgeStudio'; ?>
                </button>
            </div>
        </form>
    </div>
</div>
