/**
 * X-786: Hello Theme Generator Service
 *
 * Minimal, lightweight, performance-focused WordPress companion theme
 * designed specifically to work with ForgeStudio page builder.
 */
import * as archiverModule from "archiver";
import { Writable } from "stream";

function createArchiverInstance(options: any = { zlib: { level: 9 } }) {
  const a = (archiverModule as any).default || archiverModule;
  if (typeof a === "function") {
    return a("zip", options);
  }
  if (a?.create) {
    return a.create("zip", options);
  }
  throw new Error("Unable to instantiate archiver");
}

export interface HelloThemeFiles {
  styleCss: string;
  functionsPhp: string;
  headerPhp: string;
  footerPhp: string;
  indexPhp: string;
  pagePhp: string;
  singlePhp: string;
  themeJson: string;
  readmeTxt: string;
}

export function generateHelloThemeFiles(themeName = "Hello ForgeStudio", authorName = "ForgeStudio Team"): HelloThemeFiles {
  const styleCss = `/*
Theme Name: ${themeName}
Theme URI: https://forgestudio.app/theme
Author: ${authorName}
Author URI: https://forgestudio.app
Description: A lightweight, minimal, zero-bloat companion theme for ForgeStudio visual page builder.
Version: 1.0.0
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 7.4
License: GNU General Public License v2 or later
Text Domain: hello-forgestudio
*/

/* Reset & Builder Content Normalization */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.5; color: #111827; background-color: #ffffff; }
.forgestudio-theme-content { width: 100%; margin: 0 auto; }
.wp-site-blocks { margin: 0; padding: 0; }
`;

  const functionsPhp = `<?php
/**
 * ${themeName} Theme Functions
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

function hello_forgestudio_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'script', 'style' ) );

	register_nav_menus( array(
		'primary' => __( 'Primary Menu', 'hello-forgestudio' ),
		'footer'  => __( 'Footer Menu', 'hello-forgestudio' ),
	) );
}
add_action( 'after_setup_theme', 'hello_forgestudio_setup' );

function hello_forgestudio_scripts() {
	wp_enqueue_style( 'hello-forgestudio-style', get_stylesheet_uri(), array(), '1.0.0' );
}
add_action( 'wp_enqueue_scripts', 'hello_forgestudio_scripts' );
`;

  const headerPhp = `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="page" class="site">
	<a class="skip-link screen-reader-text" href="#content"><?php esc_html_e( 'Skip to content', 'hello-forgestudio' ); ?></a>
	<main id="content" class="site-main">
`;

  const footerPhp = `	</main><!-- #content -->
</div><!-- #page -->
<?php wp_footer(); ?>
</body>
</html>
`;

  const indexPhp = `<?php
get_header();
if ( have_posts() ) :
	while ( have_posts() ) : the_post();
		?>
		<article id="post-<?php the_ID(); ?>" <?php post_class( 'forgestudio-theme-content' ); ?>>
			<?php the_content(); ?>
		</article>
		<?php
	endwhile;
endif;
get_footer();
`;

  const pagePhp = `<?php
get_header();
while ( have_posts() ) : the_post();
	?>
	<article id="page-<?php the_ID(); ?>" <?php post_class( 'forgestudio-page-content' ); ?>>
		<?php the_content(); ?>
	</article>
	<?php
endwhile;
get_footer();
`;

  const singlePhp = `<?php
get_header();
while ( have_posts() ) : the_post();
	?>
	<article id="post-<?php the_ID(); ?>" <?php post_class( 'forgestudio-single-content' ); ?>>
		<h1 class="entry-title"><?php the_title(); ?></h1>
		<div class="entry-content">
			<?php the_content(); ?>
		</div>
	</article>
	<?php
endwhile;
get_footer();
`;

  const themeJson = JSON.stringify(
    {
      $schema: "https://schemas.wp.org/trunk/theme.json",
      version: 2,
      settings: {
        appearanceTools: true,
        layout: {
          contentSize: "1280px",
          wideSize: "1440px",
        },
      },
    },
    null,
    2
  );

  const readmeTxt = `=== ${themeName} ===
Contributors: forgestudio
Tags: full-site-editing, one-column, custom-colors, custom-menu, e-commerce, flex-grid
Requires at least: 6.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later

Minimal companion theme for ForgeStudio. Zero bloat, maximum performance.
`;

  return {
    styleCss,
    functionsPhp,
    headerPhp,
    footerPhp,
    indexPhp,
    pagePhp,
    singlePhp,
    themeJson,
    readmeTxt,
  };
}

export async function buildHelloThemeZipStream(themeName = "Hello ForgeStudio"): Promise<Buffer> {
  const themeFiles = generateHelloThemeFiles(themeName);

  return new Promise((resolve, reject) => {
    const archive = createArchiverInstance({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const bufferStream = new Writable({
      write(chunk, encoding, next) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        next();
      },
    });

    archive.on("error", (err: any) => reject(err));
    bufferStream.on("finish", () => resolve(Buffer.concat(chunks)));

    archive.pipe(bufferStream);

    archive.append(themeFiles.styleCss, { name: "style.css" });
    archive.append(themeFiles.functionsPhp, { name: "functions.php" });
    archive.append(themeFiles.headerPhp, { name: "header.php" });
    archive.append(themeFiles.footerPhp, { name: "footer.php" });
    archive.append(themeFiles.indexPhp, { name: "index.php" });
    archive.append(themeFiles.pagePhp, { name: "page.php" });
    archive.append(themeFiles.singlePhp, { name: "single.php" });
    archive.append(themeFiles.themeJson, { name: "theme.json" });
    archive.append(themeFiles.readmeTxt, { name: "readme.txt" });

    archive.finalize();
  });
}
