#!/usr/bin/env node
const { randomBytes, scryptSync } = require('crypto');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/hash-password.cjs <email> <password> [full_name]');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/hash-password.cjs admin@example.com SecurePass123 "Admin User"');
  process.exit(1);
}

const [email, password, fullName] = args;
const salt = randomBytes(16).toString('hex');
const derivedKey = scryptSync(password, salt, 64).toString('hex');
const hash = `${salt}:${derivedKey}`;

const id = 'gen_random_uuid()';
const nameLiteral = fullName ? `'${fullName.replace(/'/g, "''")}'` : 'NULL';
const emailLiteral = email.toLowerCase().replace(/'/g, "''");

console.log('-- Run this SQL in your Supabase SQL Editor:');
console.log('');
console.log('INSERT INTO users (id, email, password_hash, full_name, is_active)');
console.log(`VALUES (${id}, '${emailLiteral}', '${hash}', ${nameLiteral}, true);`);
console.log('');
