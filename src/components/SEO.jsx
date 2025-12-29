import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for Trasealla CRM
 * Provides comprehensive SEO meta tags
 * Built by Trasealla Solutions
 * 
 * Only the landing page (/) will be indexed by Google
 * All other pages are private CRM application pages
 */

const defaultSEO = {
  siteName: 'Trasealla CRM',
  siteUrl: 'https://crm.trasealla.com',
  defaultTitle: 'Trasealla CRM - Customer Relationship Management Software | Trasealla Solutions',
  defaultDescription: 'Trasealla CRM is a powerful multi-industry customer relationship management solution. Manage leads, deals, contacts, sales pipelines, and grow your business faster. Built by Trasealla Solutions.',
  defaultImage: 'https://crm.trasealla.com/assets/images/crm-dashboard-trasealla-solutions.png',
  twitterHandle: '@trasealla',
  author: 'Trasealla Solutions',
  keywords: 'Trasealla CRM, Trasealla Solutions, CRM software, customer relationship management, sales management, lead management, deal tracking, pipeline management, CRM Dubai, CRM UAE, best CRM software'
};

/**
 * SEO Page configurations
 * Only landing page is public, all others are noindex
 */
export const seoConfig = {
  // Landing Page - The only indexed page
  landing: {
    title: 'Trasealla CRM - #1 Customer Relationship Management Software | Trasealla Solutions',
    description: 'Grow your business faster with Trasealla CRM. Close more deals, build stronger relationships, and scale without limits. The #1 CRM solution in UAE by Trasealla Solutions. Start your 14-day free trial today.',
    keywords: 'Trasealla CRM, Trasealla Solutions, best CRM software, CRM Dubai, CRM UAE, CRM Abu Dhabi, sales CRM, lead management, deal tracking, sales pipeline, customer relationship management, business growth, CRM free trial, enterprise CRM, small business CRM',
    image: 'https://crm.trasealla.com/assets/images/crm-dashboard-trasealla-solutions.png',
    isPublic: true
  },
  
  // All other pages - Not indexed
  login: {
    title: 'Login - Trasealla CRM | Trasealla Solutions',
    description: 'Sign in to your Trasealla CRM account.',
    isPublic: false
  },
  register: {
    title: 'Register - Trasealla CRM | Trasealla Solutions',
    description: 'Create your Trasealla CRM account.',
    isPublic: false
  },
  dashboard: {
    title: 'Dashboard - Trasealla CRM',
    description: 'Your CRM dashboard.',
    isPublic: false
  },
  leads: {
    title: 'Leads - Trasealla CRM',
    description: 'Manage your leads.',
    isPublic: false
  },
  deals: {
    title: 'Deals - Trasealla CRM',
    description: 'Manage your deals.',
    isPublic: false
  },
  contacts: {
    title: 'Contacts - Trasealla CRM',
    description: 'Manage your contacts.',
    isPublic: false
  },
  accounts: {
    title: 'Accounts - Trasealla CRM',
    description: 'Manage your accounts.',
    isPublic: false
  },
  activities: {
    title: 'Activities - Trasealla CRM',
    description: 'Manage your activities.',
    isPublic: false
  },
  pipelines: {
    title: 'Pipelines - Trasealla CRM',
    description: 'Manage your pipelines.',
    isPublic: false
  },
  calendar: {
    title: 'Calendar - Trasealla CRM',
    description: 'Your calendar.',
    isPublic: false
  },
  notes: {
    title: 'Notes - Trasealla CRM',
    description: 'Your notes.',
    isPublic: false
  },
  tags: {
    title: 'Tags - Trasealla CRM',
    description: 'Manage tags.',
    isPublic: false
  },
  products: {
    title: 'Products - Trasealla CRM',
    description: 'Manage products.',
    isPublic: false
  },
  quotes: {
    title: 'Quotes - Trasealla CRM',
    description: 'Manage quotes.',
    isPublic: false
  },
  campaigns: {
    title: 'Campaigns - Trasealla CRM',
    description: 'Manage campaigns.',
    isPublic: false
  },
  audiences: {
    title: 'Audiences - Trasealla CRM',
    description: 'Manage audiences.',
    isPublic: false
  },
  emailTemplates: {
    title: 'Email Templates - Trasealla CRM',
    description: 'Manage email templates.',
    isPublic: false
  },
  inbox: {
    title: 'Inbox - Trasealla CRM',
    description: 'Your inbox.',
    isPublic: false
  },
  integrations: {
    title: 'Integrations - Trasealla CRM',
    description: 'Manage integrations.',
    isPublic: false
  },
  documents: {
    title: 'Documents - Trasealla CRM',
    description: 'Manage documents.',
    isPublic: false
  },
  reports: {
    title: 'Reports - Trasealla CRM',
    description: 'View reports.',
    isPublic: false
  },
  branches: {
    title: 'Branches - Trasealla CRM',
    description: 'Manage branches.',
    isPublic: false
  },
  workflows: {
    title: 'Workflows - Trasealla CRM',
    description: 'Manage workflows.',
    isPublic: false
  },
  customFields: {
    title: 'Custom Fields - Trasealla CRM',
    description: 'Manage custom fields.',
    isPublic: false
  },
  auditLogs: {
    title: 'Audit Logs - Trasealla CRM',
    description: 'View audit logs.',
    isPublic: false
  },
  superAdminLogin: {
    title: 'Admin Login - Trasealla CRM',
    description: 'Admin login.',
    isPublic: false
  },
  superAdminDashboard: {
    title: 'Admin Dashboard - Trasealla CRM',
    description: 'Admin dashboard.',
    isPublic: false
  },
  superAdminTenants: {
    title: 'Tenants - Trasealla CRM',
    description: 'Manage tenants.',
    isPublic: false
  }
};

/**
 * SEO Component
 * @param {Object} props
 * @param {string} props.page - Page identifier from seoConfig
 * @param {string} props.title - Custom title
 * @param {string} props.description - Custom description
 * @param {boolean} props.noindex - Force noindex
 */
export default function SEO({
  page,
  title,
  description,
  keywords,
  image,
  url,
  noindex,
  structuredData
}) {
  const pageConfig = seoConfig[page] || {};
  
  const finalTitle = title || pageConfig.title || defaultSEO.defaultTitle;
  const finalDescription = description || pageConfig.description || defaultSEO.defaultDescription;
  const finalKeywords = keywords || pageConfig.keywords || defaultSEO.keywords;
  const finalImage = image || pageConfig.image || defaultSEO.defaultImage;
  const finalUrl = url || `${defaultSEO.siteUrl}${window.location.pathname}`;
  
  // Only landing page is indexed
  const shouldNoindex = noindex !== undefined ? noindex : (pageConfig.isPublic === false);
  const robotsContent = shouldNoindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={defaultSEO.author} />
      <meta name="robots" content={robotsContent} />
      
      <link rel="canonical" href={finalUrl} />
      
      <meta property="og:type" content="website" />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content={defaultSEO.siteName} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:site" content={defaultSEO.twitterHandle} />
      
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
