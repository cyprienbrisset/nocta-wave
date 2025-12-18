import { PrismaClient, TeamRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@wsflows.local' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@wsflows.local',
      passwordHash,
      name: 'Admin',
      isActive: true,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create default team
  const defaultTeam = await prisma.team.create({
    data: {
      name: 'Default Team',
      slug: 'default',
      members: {
        create: {
          userId: adminUser.id,
          role: TeamRole.OWNER,
        },
      },
    },
  });

  console.log(`Created default team: ${defaultTeam.name}`);

  // Create default tags for the team
  const defaultTags = [
    { name: 'Production', color: '#22c55e' },
    { name: 'Development', color: '#3b82f6' },
    { name: 'Test', color: '#f59e0b' },
    { name: 'Important', color: '#ef4444' },
    { name: 'Automation', color: '#8b5cf6' },
  ];

  for (const tag of defaultTags) {
    await prisma.tag.create({
      data: {
        name: tag.name,
        color: tag.color,
        teamId: defaultTeam.id,
      },
    });
  }

  console.log(`Created ${defaultTags.length} default tags`);

  // Create sample workflow templates
  const templates = [
    {
      name: 'HTTP Request Basic',
      description: 'Simple HTTP request workflow with error handling',
      category: 'integration',
      icon: 'Globe',
      isPublic: true,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger.manual',
            position: { x: 100, y: 200 },
            data: { label: 'Manual Trigger', config: {} },
          },
          {
            id: 'http-1',
            type: 'http.request',
            position: { x: 350, y: 200 },
            data: {
              label: 'HTTP Request',
              config: {
                method: 'GET',
                url: 'https://api.example.com/data',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'http-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    {
      name: 'Slack Notification',
      description: 'Send a notification to Slack channel',
      category: 'communication',
      icon: 'MessageSquare',
      isPublic: true,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger.webhook',
            position: { x: 100, y: 200 },
            data: { label: 'Webhook Trigger', config: {} },
          },
          {
            id: 'slack-1',
            type: 'integration.slack',
            position: { x: 350, y: 200 },
            data: {
              label: 'Send Slack Message',
              config: {
                channel: '#general',
                message: '{{trigger.body.message}}',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    {
      name: 'Data Transformation',
      description: 'Transform and filter data from an API',
      category: 'data-sync',
      icon: 'Shuffle',
      isPublic: true,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger.cron',
            position: { x: 100, y: 200 },
            data: {
              label: 'Cron Trigger',
              config: { schedule: '0 * * * *' },
            },
          },
          {
            id: 'http-1',
            type: 'http.request',
            position: { x: 300, y: 200 },
            data: {
              label: 'Fetch Data',
              config: { method: 'GET', url: 'https://api.example.com/items' },
            },
          },
          {
            id: 'filter-1',
            type: 'transform.filter',
            position: { x: 500, y: 200 },
            data: {
              label: 'Filter Active',
              config: { condition: 'item.active === true' },
            },
          },
          {
            id: 'map-1',
            type: 'transform.map',
            position: { x: 700, y: 200 },
            data: {
              label: 'Transform',
              config: { expression: '{ id: item.id, name: item.name }' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'http-1' },
          { id: 'e2', source: 'http-1', target: 'filter-1' },
          { id: 'e3', source: 'filter-1', target: 'map-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  ];

  for (const template of templates) {
    await prisma.workflowTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        isPublic: template.isPublic,
        graph: template.graph,
        teamId: defaultTeam.id,
        createdById: adminUser.id,
      },
    });
  }

  console.log(`Created ${templates.length} workflow templates`);

  console.log('');
  console.log('='.repeat(50));
  console.log('Database seeded successfully!');
  console.log('='.repeat(50));
  console.log('');
  console.log('Admin credentials:');
  console.log(`  Email:    admin@wsflows.local`);
  console.log(`  Password: ${adminPassword}`);
  console.log('');
  console.log('IMPORTANT: Change the admin password after first login!');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
