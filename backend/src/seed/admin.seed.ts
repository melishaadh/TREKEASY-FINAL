import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import { Admin, AdminSchema } from '../schemas/admin.schema';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/trekeasy'),
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
  ],
})
class SeedModule {}

async function seedAdmin() {
  console.log('Connecting to MongoDB Atlas...');
  const appContext = await NestFactory.createApplicationContext(SeedModule);

  const conn = appContext.get(MongooseModule);
  const adminModel = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

  const username = process.env.ADMIN_USERNAME || 'TrekEasyAdmin';
  const password = process.env.ADMIN_PASSWORD || 'TrekE@sy';
  const displayName = 'TrekEasy Administrator';

  console.log(`Checking for existing admin: ${username}...`);

  const existing = await adminModel.findOne({ username }).exec();
  if (existing) {
    console.log(`Admin user "${username}" already exists. Updating password...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    await adminModel.updateOne({ username }, { password_hash: hashedPassword }).exec();
    console.log('Password updated successfully.');
  } else {
    console.log(`Creating admin user "${username}"...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    await adminModel.create({
      username,
      password_hash: hashedPassword,
      display_name: displayName,
      role: 'super_admin',
      last_login: null,
    });
    console.log('Admin user created successfully.');
  }

  console.log({
    username,
    password: password,
    display_name: displayName,
    role: 'super_admin',
  });

  await appContext.close();
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
