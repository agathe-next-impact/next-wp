<?php
/**
 * Plugin Name: Next-WP SEO GraphQL
 * Description: Adds an `seo` field to all content types in WPGraphQL.
 *              Uses Yoast SEO data if available, otherwise builds from native WP data.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('graphql_register_types', function () {
    // If WPGraphQL Yoast SEO plugin is active, skip to avoid field conflicts
    if (class_exists('WPGraphQL\\YoastSEO\\Plugin')) {
        return;
    }

    // 1. Register SeoImage type
    register_graphql_object_type('SeoImage', [
        'description' => 'SEO image data',
        'fields' => [
            'sourceUrl' => ['type' => 'String'],
            'width'     => ['type' => 'Int'],
            'height'    => ['type' => 'Int'],
            'altText'   => ['type' => 'String'],
        ],
    ]);

    // 2. Register SeoData type
    register_graphql_object_type('SeoData', [
        'description' => 'SEO metadata for content',
        'fields' => [
            'title'                => ['type' => 'String'],
            'metaDesc'             => ['type' => 'String'],
            'canonical'            => ['type' => 'String'],
            'opengraphTitle'       => ['type' => 'String'],
            'opengraphDescription' => ['type' => 'String'],
            'opengraphUrl'         => ['type' => 'String'],
            'opengraphImage'       => ['type' => 'SeoImage'],
            'twitterTitle'         => ['type' => 'String'],
            'twitterDescription'   => ['type' => 'String'],
            'twitterImage'         => ['type' => 'SeoImage'],
        ],
    ]);

    // 3. Add `seo` field to ContentNode interface (covers ALL content types)
    register_graphql_field('ContentNode', 'seo', [
        'type'        => 'SeoData',
        'description' => 'SEO metadata (Yoast if available, otherwise native WP data)',
        'resolve'     => function ($post) {
            return nextwp_resolve_seo($post);
        },
    ]);
});

/**
 * Main SEO resolver — routes to Yoast or native fallback.
 */
function nextwp_resolve_seo($post): array {
    $post_id = $post->databaseId ?? $post->ID ?? 0;
    if (!$post_id) return [];

    $wp_post = get_post($post_id);
    if (!$wp_post) return [];

    if (class_exists('WPSEO_Meta') && class_exists('WPSEO_Options')) {
        return nextwp_resolve_yoast_seo($wp_post);
    }

    return nextwp_resolve_native_seo($wp_post);
}

/**
 * Resolve SEO data from Yoast SEO.
 */
function nextwp_resolve_yoast_seo(WP_Post $post): array {
    // Try modern Yoast Surface API first (Yoast >= 14.0)
    if (class_exists('Yoast\\WP\\SEO\\Surfaces\\Meta_Surface') && function_exists('YoastSEO')) {
        $meta = YoastSEO()->meta->for_post($post->ID);

        if ($meta) {
            $og_image = $meta->open_graph_images[0] ?? null;

            return [
                'title'                => $meta->title ?? '',
                'metaDesc'             => $meta->description ?? '',
                'canonical'            => $meta->canonical ?? get_permalink($post),
                'opengraphTitle'       => $meta->open_graph_title ?? '',
                'opengraphDescription' => $meta->open_graph_description ?? '',
                'opengraphUrl'         => $meta->open_graph_url ?? get_permalink($post),
                'opengraphImage'       => $og_image ? [
                    'sourceUrl' => $og_image['url'] ?? '',
                    'width'     => (int) ($og_image['width'] ?? 0),
                    'height'    => (int) ($og_image['height'] ?? 0),
                    'altText'   => $og_image['alt'] ?? '',
                ] : nextwp_get_fallback_image($post),
                'twitterTitle'         => $meta->twitter_title ?? '',
                'twitterDescription'   => $meta->twitter_description ?? '',
                'twitterImage'         => null,
            ];
        }
    }

    // Fallback to WPSEO_Meta direct access for older Yoast versions
    $title     = WPSEO_Meta::get_value('title', $post->ID);
    $meta_desc = WPSEO_Meta::get_value('metadesc', $post->ID);
    $og_title  = WPSEO_Meta::get_value('opengraph-title', $post->ID);
    $og_desc   = WPSEO_Meta::get_value('opengraph-description', $post->ID);
    $og_img    = WPSEO_Meta::get_value('opengraph-image', $post->ID);
    $og_img_id = WPSEO_Meta::get_value('opengraph-image-id', $post->ID);

    $og_image_data = nextwp_build_image_data($og_img, $og_img_id);
    if (!$og_image_data) {
        $og_image_data = nextwp_get_fallback_image($post);
    }

    return [
        'title'                => $title ?: get_the_title($post),
        'metaDesc'             => $meta_desc ?: '',
        'canonical'            => WPSEO_Meta::get_value('canonical', $post->ID) ?: get_permalink($post),
        'opengraphTitle'       => $og_title ?: $title ?: get_the_title($post),
        'opengraphDescription' => $og_desc ?: $meta_desc ?: '',
        'opengraphUrl'         => get_permalink($post),
        'opengraphImage'       => $og_image_data,
        'twitterTitle'         => WPSEO_Meta::get_value('twitter-title', $post->ID) ?: '',
        'twitterDescription'   => WPSEO_Meta::get_value('twitter-description', $post->ID) ?: '',
        'twitterImage'         => null,
    ];
}

/**
 * Resolve SEO data from native WordPress data (no Yoast).
 */
function nextwp_resolve_native_seo(WP_Post $post): array {
    $title   = get_the_title($post);
    $excerpt = has_excerpt($post) ? wp_strip_all_tags(get_the_excerpt($post)) : '';

    if (!$excerpt && $post->post_content) {
        $excerpt = wp_trim_words(wp_strip_all_tags($post->post_content), 30, '...');
    }

    $permalink  = get_permalink($post);
    $image_data = nextwp_get_fallback_image($post);

    return [
        'title'                => $title,
        'metaDesc'             => $excerpt,
        'canonical'            => $permalink,
        'opengraphTitle'       => $title,
        'opengraphDescription' => $excerpt,
        'opengraphUrl'         => $permalink,
        'opengraphImage'       => $image_data,
        'twitterTitle'         => $title,
        'twitterDescription'   => $excerpt,
        'twitterImage'         => $image_data,
    ];
}

/**
 * Get fallback image: featured image, then site logo.
 */
function nextwp_get_fallback_image(WP_Post $post): ?array {
    $thumb_id = get_post_thumbnail_id($post);
    if ($thumb_id) {
        $data = nextwp_build_image_data(null, $thumb_id);
        if ($data) return $data;
    }

    $custom_logo_id = get_theme_mod('custom_logo');
    if ($custom_logo_id) {
        $data = nextwp_build_image_data(null, $custom_logo_id);
        if ($data) return $data;
    }

    return null;
}

/**
 * Build image data array from URL or attachment ID.
 */
function nextwp_build_image_data(?string $url, $attachment_id = 0): ?array {
    if ($attachment_id) {
        $src = wp_get_attachment_image_src((int) $attachment_id, 'full');
        if ($src) {
            return [
                'sourceUrl' => $src[0],
                'width'     => (int) $src[1],
                'height'    => (int) $src[2],
                'altText'   => get_post_meta((int) $attachment_id, '_wp_attachment_image_alt', true) ?: '',
            ];
        }
    }

    if ($url) {
        return [
            'sourceUrl' => $url,
            'width'     => 0,
            'height'    => 0,
            'altText'   => '',
        ];
    }

    return null;
}
