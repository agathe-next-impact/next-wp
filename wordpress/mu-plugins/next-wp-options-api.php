<?php
/**
 * Plugin Name: Next-WP ACF Options Pages API
 * Description: Exposes ACF Options Pages data via a custom REST endpoint for headless consumption.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('next-wp/v1', '/options-pages', [
        'methods'  => 'GET',
        'callback' => 'nextwp_get_options_pages',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('next-wp/v1', '/options-pages/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods'  => 'GET',
        'callback' => 'nextwp_get_options_page_by_slug',
        'permission_callback' => '__return_true',
        'args' => [
            'slug' => [
                'required' => true,
                'sanitize_callback' => 'sanitize_title',
            ],
        ],
    ]);
});

function nextwp_get_options_pages(): WP_REST_Response {
    if (!function_exists('acf_get_options_pages')) {
        return new WP_REST_Response([], 200);
    }

    $pages = acf_get_options_pages();
    if (empty($pages)) {
        return new WP_REST_Response([], 200);
    }

    $result = [];
    foreach ($pages as $page) {
        $result[] = [
            'slug'        => $page['menu_slug'] ?? '',
            'page_title'  => $page['page_title'] ?? '',
            'menu_title'  => $page['menu_title'] ?? '',
            'description' => $page['description'] ?? '',
            'icon_url'    => $page['icon_url'] ?? '',
            'parent_slug' => $page['parent_slug'] ?? '',
            'post_id'     => $page['post_id'] ?? $page['menu_slug'] ?? '',
        ];
    }

    return new WP_REST_Response($result, 200);
}

function nextwp_get_options_page_by_slug(WP_REST_Request $request): WP_REST_Response {
    $slug = $request->get_param('slug');

    if (!function_exists('acf_get_options_pages') || !function_exists('get_fields')) {
        return new WP_REST_Response(
            ['code' => 'acf_not_available', 'message' => 'ACF Pro is not active'],
            404
        );
    }

    $pages = acf_get_options_pages();
    $target_page = null;

    foreach ($pages as $page) {
        if (($page['menu_slug'] ?? '') === $slug) {
            $target_page = $page;
            break;
        }
    }

    if (!$target_page) {
        return new WP_REST_Response(
            ['code' => 'not_found', 'message' => 'Options page not found'],
            404
        );
    }

    $post_id = $target_page['post_id'] ?? 'options';

    // Get only field groups assigned to THIS specific options page
    // This prevents returning fields from other pages sharing the same post_id
    $field_groups = acf_get_field_groups(['options_page' => $slug]);

    $filtered = [];
    foreach ($field_groups as $group) {
        $group_fields = acf_get_fields($group['key']);
        if (!$group_fields) continue;
        foreach ($group_fields as $field) {
            $value = get_field($field['name'], $post_id);
            if ($value === null || $value === false || $value === '') continue;
            if (is_array($value) && empty($value)) continue;
            $filtered[$field['name']] = $value;
        }
    }

    return new WP_REST_Response([
        'slug'        => $target_page['menu_slug'] ?? '',
        'page_title'  => $target_page['page_title'] ?? '',
        'menu_title'  => $target_page['menu_title'] ?? '',
        'description' => $target_page['description'] ?? '',
        'icon_url'    => $target_page['icon_url'] ?? '',
        'parent_slug' => $target_page['parent_slug'] ?? '',
        'post_id'     => $post_id,
        'acf'         => !empty($filtered) ? $filtered : new stdClass(),
    ], 200);
}
