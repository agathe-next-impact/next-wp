<?php
/**
 * Plugin Name: Next-WP GraphQL Support
 * Description: Automatically exposes all custom post types and custom taxonomies to WPGraphQL.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Add show_in_graphql + graphql names to every custom post type.
 * Fires on `register_post_type_args` so it works regardless of how the CPT is registered
 * (code, ACF, CPT UI, etc.).
 */
add_filter('register_post_type_args', function (array $args, string $post_type): array {
    $built_in = [
        'post', 'page', 'attachment', 'revision', 'nav_menu_item',
        'custom_css', 'customize_changeset', 'oembed_cache',
        'user_request', 'wp_block', 'wp_template', 'wp_template_part',
        'wp_global_styles', 'wp_navigation', 'wp_font_family', 'wp_font_face',
    ];

    if (in_array($post_type, $built_in, true)) {
        return $args;
    }

    // Skip if already configured for GraphQL
    if (!empty($args['show_in_graphql'])) {
        return $args;
    }

    $args['show_in_graphql']     = true;
    $args['graphql_single_name'] = nextwp_to_camel_case($post_type);
    $args['graphql_plural_name'] = 'all' . ucfirst(nextwp_to_camel_case($post_type));

    return $args;
}, 10, 2);

/**
 * Add show_in_graphql + graphql names to every custom taxonomy.
 */
add_filter('register_taxonomy_args', function (array $args, string $taxonomy): array {
    $built_in = [
        'category', 'post_tag', 'nav_menu', 'link_category',
        'post_format', 'wp_theme', 'wp_template_part_area',
        'wp_pattern_category',
    ];

    if (in_array($taxonomy, $built_in, true)) {
        return $args;
    }

    if (!empty($args['show_in_graphql'])) {
        return $args;
    }

    $args['show_in_graphql']     = true;
    $args['graphql_single_name'] = nextwp_to_camel_case($taxonomy);
    $args['graphql_plural_name'] = 'all' . ucfirst(nextwp_to_camel_case($taxonomy));

    return $args;
}, 10, 2);

/**
 * Convert a slug like "actualite-veille" or "etude_de_cas" to camelCase "actualiteVeille".
 */
function nextwp_to_camel_case(string $slug): string {
    return lcfirst(str_replace(['-', '_'], '', ucwords($slug, '-_')));
}
