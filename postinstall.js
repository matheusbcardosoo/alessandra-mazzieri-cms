#!/usr/bin/env node
/**
 * SCRIPT DE POS-INSTALACAO
 * Executa apos npm install para preparar dependencias de runtime.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('\n========================================');
console.log('POSTINSTALL INICIADO');
console.log('========================================\n');

try {
  // Em CI e em builds de produção, o instalador da plataforma já roda
  // `npm ci --prefix server`/`--prefix client` explicitamente (ver ci.yml,
  // lighthouse-ci.yml e o script "build") — pular aqui evita instalar as
  // dependências duas vezes.
  const isAutomatedEnv = Boolean(process.env.CI) || process.env.NODE_ENV === 'production';

  if (!isAutomatedEnv) {
    console.log('Instalando dependencias do server...');
    execSync('npm install', {
      stdio: 'inherit',
      cwd: path.join(__dirname, 'server'),
    });

    console.log('\nInstalando dependencias do client...');
    execSync('npm install', {
      stdio: 'inherit',
      cwd: path.join(__dirname, 'client'),
    });
  }

  console.log('\nGerando Prisma Client...');
  const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');

  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    stdio: 'inherit',
    cwd: __dirname,
  });

  if (process.env.NODE_ENV === 'production') {
    console.log('\nAmbiente de producao detectado.');
    console.log('O servidor sera iniciado apenas pelo comando npm start da plataforma.');
  } else {
    console.log('\nAmbiente de desenvolvimento detectado.');
  }

  console.log('Postinstall concluido com sucesso.\n');
} catch (error) {
  console.error('Erro no postinstall:', error.message);
  console.log('Continuando instalacao apesar do erro.\n');
}