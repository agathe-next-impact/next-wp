# WordPress Setup for next-wp

This guide covers the WordPress-side configuration required for the headless Next.js frontend.

## Required Plugins

### 1. WPGraphQL (required)

The Next.js frontend uses GraphQL to fetch all WordPress data.

**Installation:**
- **Docker (automatic):** Included in the Docker image, activated automatically by `setup.sh`
- **Manual:** Install from [wordpress.org/plugins/wp-graphql](https://wordpress.org/plugins/wp-graphql/) or search "WPGraphQL" in Plugins > Add New

**Minimum version:** 1.6+ (required for `pageInfo.total` support)

**Verification:**
After activation, the GraphQL endpoint is available at:
```
https://your-wordpress-site.com/graphql
```

You can test it with the built-in GraphiQL IDE at:
```
WordPress Admin > GraphQL > GraphiQL IDE
```

Example test query:
```graphql
{
  posts(first: 3) {
    nodes {
      title
      slug
    }
  }
}
```

### 2. Next.js Revalidation (required)

Notifies the Next.js frontend when content changes so cached pages are regenerated.

**Installation:**
- **Docker (automatic):** Included in the Docker image, activated automatically
- **Manual:** Upload `next-revalidate.zip` from the `plugin/` directory via Plugins > Add New > Upload

**Configuration:**
1. Go to **Settings > Next.js Revalidation** (or the **Next.js** menu item)
2. Set **Next.js Site URL**: `https://your-nextjs-site.com` (no trailing slash)
3. Set **Webhook Secret**: a random string (generate with `openssl rand -base64 32`)
4. Save

The webhook secret must match the `WORDPRESS_WEBHOOK_SECRET` environment variable in your Next.js `.env.local`.

**Monitored events:**
- Post create/update/delete/trash
- Category/tag create/edit/delete
- Author profile changes
- Media uploads/edits
- Menu changes

## Environment Variables

### Next.js side (`.env.local`)

```env
WORDPRESS_URL="https://your-wordpress-site.com"
WORDPRESS_HOSTNAME="your-wordpress-site.com"
WORDPRESS_WEBHOOK_SECRET="your-secret-key"
```

### Docker WordPress side

```env
WORDPRESS_URL=http://localhost:8080
WORDPRESS_ADMIN_USER=admin
WORDPRESS_ADMIN_PASSWORD=changeme
WORDPRESS_ADMIN_EMAIL=admin@example.com
NEXTJS_URL=http://localhost:3000
WORDPRESS_WEBHOOK_SECRET=your-secret-key
```

## Docker Setup (Recommended)

The `wordpress/` directory contains a Docker setup that auto-installs WordPress with all required plugins:

```bash
# From the project root, if you have a docker-compose.yml:
docker compose up -d
```

The Docker setup automatically:
1. Installs WordPress
2. Installs and activates **WPGraphQL**
3. Installs and activates **Next.js Revalidation**
4. Activates the headless theme
5. Configures the revalidation plugin with `NEXTJS_URL` and `WORDPRESS_WEBHOOK_SECRET`
6. Removes default plugins (Akismet, Hello Dolly)
7. Creates a `robots.txt` that blocks crawlers (the Next.js site is the public frontend)

## Manual Setup (Without Docker)

If you're using an existing WordPress installation:

### Step 1: Install WPGraphQL

1. Go to **Plugins > Add New**
2. Search for "WPGraphQL"
3. Install and activate
4. Verify the endpoint works at `https://your-site.com/graphql`

### Step 2: Install Next.js Revalidation

1. Download `next-revalidate.zip` from the `plugin/` directory
2. Go to **Plugins > Add New > Upload Plugin**
3. Upload the zip file and activate
4. Configure via **Settings > Next.js Revalidation**:
   - **Next.js Site URL**: your Next.js deployment URL
   - **Webhook Secret**: same value as `WORDPRESS_WEBHOOK_SECRET` in Next.js

### Step 3: Configure Permalinks

1. Go to **Settings > Permalinks**
2. Select **Post name** (`/%postname%/`)
3. Save — this ensures clean slugs for the Next.js routing

### Step 4: Configure Image Domains

Ensure your Next.js `next.config.ts` includes your WordPress domain in `images.remotePatterns` for image optimization.

## How Revalidation Works

```
WordPress content change
        |
        v
Next.js Revalidation plugin
        |
        v
POST https://nextjs-site.com/api/revalidate
  Header: x-webhook-secret: <secret>
  Body: { "contentType": "post", "contentId": 123 }
        |
        v
Next.js /api/revalidate route
        |
        v
revalidateTag("posts"), revalidateTag("post-123")
revalidatePath("/", "layout")
        |
        v
Next visitor gets fresh content
```

## Troubleshooting

### GraphQL endpoint returns 404
- Ensure WPGraphQL is activated
- Go to **Settings > Permalinks** and click **Save** (flushes rewrite rules)

### Revalidation not working
- Check **Next.js > History** in WordPress admin for request logs
- Verify the webhook secret matches on both sides
- Ensure the Next.js URL is reachable from the WordPress server
- Enable **Debug Mode** in the plugin settings for detailed PHP error log output

### Build fails with "WordPress URL not configured"
- This is a warning, not an error. The build uses graceful degradation and generates empty static pages when WordPress is unavailable
- Set `WORDPRESS_URL` in `.env.local` for full static generation
