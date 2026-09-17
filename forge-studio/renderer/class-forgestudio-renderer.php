<?php
/**
 * Server-side HTML/CSS Renderer for ForgeStudio Documents on WordPress.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ForgeStudio_Renderer {

    /**
     * Render a complete ForgeStudio document JSON into HTML and inline CSS.
     *
     * @param array|string $document
     * @return string Rendered HTML output with styles
     */
    public static function render_document( $document ) {
        if ( is_string( $document ) ) {
            $document = json_decode( $document, true );
        }

        if ( ! is_array( $document ) ) {
            return '';
        }

        $elements = isset( $document['elements'] ) && is_array( $document['elements'] )
            ? $document['elements']
            : array();

        $html_output = '';
        foreach ( $elements as $element ) {
            $html_output .= self::render_element( $element );
        }

        // Wrap in lightweight container
        return '<div class="forgestudio-content-wrap">' . $html_output . '</div>';
    }

    /**
     * Recursively render an individual element.
     */
    public static function render_element( $el ) {
        if ( ! is_array( $el ) || empty( $el['type'] ) ) {
            return '';
        }

        $type     = sanitize_key( $el['type'] );
        $id       = isset( $el['id'] ) ? esc_attr( $el['id'] ) : 'fs-el-' . uniqid();
        $content  = isset( $el['content'] ) ? $el['content'] : array();
        $styles   = isset( $el['styles'] ) ? $el['styles'] : array();
        $children = isset( $el['children'] ) && is_array( $el['children'] ) ? $el['children'] : array();

        $inline_style = self::build_inline_styles( $styles );

        switch ( $type ) {
            case 'section':
            case 'container':
                $inner_html = '';
                foreach ( $children as $child ) {
                    $inner_html .= self::render_element( $child );
                }
                return sprintf(
                    '<section id="%s" class="forgestudio-section" style="%s">%s</section>',
                    $id,
                    esc_attr( $inline_style ),
                    $inner_html
                );

            case 'heading':
                $tag      = isset( $content['level'] ) ? 'h' . intval( $content['level'] ) : ( isset( $content['tag'] ) ? esc_attr( $content['tag'] ) : 'h2' );
                $text     = isset( $content['text'] ) ? esc_html( $content['text'] ) : ( is_string( $content ) ? esc_html( $content ) : '' );
                return sprintf(
                    '<%1$s id="%2$s" class="forgestudio-heading" style="%3$s">%4$s</%1$s>',
                    $tag,
                    $id,
                    esc_attr( $inline_style ),
                    $text
                );

            case 'text':
            case 'paragraph':
                $text = isset( $content['text'] ) ? wp_kses_post( $content['text'] ) : ( is_string( $content ) ? wp_kses_post( $content ) : '' );
                return sprintf(
                    '<div id="%s" class="forgestudio-text" style="%s">%s</div>',
                    $id,
                    esc_attr( $inline_style ),
                    $text
                );

            case 'image':
                $url = isset( $content['url'] ) ? esc_url( $content['url'] ) : ( isset( $content['src'] ) ? esc_url( $content['src'] ) : '' );
                $alt = isset( $content['alt'] ) ? esc_attr( $content['alt'] ) : '';
                if ( empty( $url ) ) {
                    return '';
                }
                return sprintf(
                    '<div id="%s" class="forgestudio-image-wrap" style="%s"><img src="%s" alt="%s" style="max-width:100%%;height:auto;" /></div>',
                    $id,
                    esc_attr( $inline_style ),
                    $url,
                    $alt
                );

            case 'button':
                $label = isset( $content['text'] ) ? esc_html( $content['text'] ) : ( isset( $content['label'] ) ? esc_html( $content['label'] ) : 'Click Here' );
                $url   = isset( $content['url'] ) ? esc_url( $content['url'] ) : '#';
                return sprintf(
                    '<div id="%s" class="forgestudio-button-wrap"><a href="%s" class="forgestudio-button" style="%s">%s</a></div>',
                    $id,
                    $url,
                    esc_attr( $inline_style ),
                    $label
                );

            case 'divider':
                return sprintf(
                    '<hr id="%s" class="forgestudio-divider" style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;%s" />',
                    $id,
                    esc_attr( $inline_style )
                );

            case 'spacer':
                $height = isset( $styles['height'] ) ? esc_attr( $styles['height'] ) : '32px';
                return sprintf(
                    '<div id="%s" class="forgestudio-spacer" style="height:%s;%s"></div>',
                    $id,
                    $height,
                    esc_attr( $inline_style )
                );

            default:
                // Generic fallback container
                $inner_html = '';
                foreach ( $children as $child ) {
                    $inner_html .= self::render_element( $child );
                }
                return sprintf(
                    '<div id="%s" class="forgestudio-element forgestudio-type-%s" style="%s">%s</div>',
                    $id,
                    $type,
                    esc_attr( $inline_style ),
                    $inner_html
                );
        }
    }

    /**
     * Build clean CSS style string from style array.
     */
    private static function build_inline_styles( $styles ) {
        if ( ! is_array( $styles ) || empty( $styles ) ) {
            return '';
        }

        $css_rules = array();

        $allowed_props = array(
            'color'           => 'color',
            'backgroundColor' => 'background-color',
            'fontSize'        => 'font-size',
            'fontWeight'      => 'font-weight',
            'textAlign'       => 'text-align',
            'padding'         => 'padding',
            'margin'          => 'margin',
            'borderRadius'    => 'border-radius',
            'width'           => 'width',
            'maxWidth'        => 'max-width',
            'display'         => 'display',
            'flexDirection'   => 'flex-direction',
            'gap'             => 'gap',
        );

        foreach ( $styles as $key => $val ) {
            if ( isset( $allowed_props[$key] ) && is_string( $val ) && '' !== $val ) {
                $css_rules[] = sprintf( '%s: %s', $allowed_props[$key], sanitize_text_field( $val ) );
            }
        }

        return implode( '; ', $css_rules );
    }
}
