/**
 * ElevenLabs API Information Tool
 *
 * This script provides information about your ElevenLabs account:
 * - Current subscription plan
 * - Usage limits (characters, voices, etc.)
 * - Available models
 * - User information
 *
 * Usage:
 *   node test-elevenlabs-api.js [command]
 *
 * Commands:
 *   user       - Show user information and subscription
 *   limits     - Show usage limits and quotas
 *   models     - List available models
 *   voices     - List available voices
 *   all        - Show all information (default)
 */

// Load environment variables
require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Validate API key
if (!ELEVENLABS_API_KEY) {
  console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables!');
  console.log('\n💡 Please set it in your .env file:');
  console.log('   ELEVENLABS_API_KEY=sk_your_api_key_here\n');
  process.exit(1);
}

// Helper function to make API requests
async function apiRequest(endpoint) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

// Get user information and subscription
async function getUserInfo() {
  console.log('\n' + '='.repeat(60));
  console.log('👤 USER INFORMATION');
  console.log('='.repeat(60) + '\n');

  const user = await apiRequest('/user');

  if (!user) {
    console.log('❌ Failed to fetch user information\n');
    return;
  }

  console.log('📧 Email:', user.email || 'N/A');
  console.log('🆔 User ID:', user.xi_user_id || 'N/A');

  if (user.subscription) {
    const sub = user.subscription;
    console.log('\n💳 SUBSCRIPTION:');
    console.log('  - Tier:', sub.tier || 'N/A');
    console.log('  - Status:', sub.status || 'N/A');
    console.log('  - Character Count:', sub.character_count?.toLocaleString() || '0');
    console.log('  - Character Limit:', sub.character_limit?.toLocaleString() || 'Unlimited');

    if (sub.character_limit) {
      const usagePercent = ((sub.character_count / sub.character_limit) * 100).toFixed(2);
      console.log('  - Usage:', `${usagePercent}%`);

      // Progress bar
      const barLength = 40;
      const filled = Math.round((sub.character_count / sub.character_limit) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      console.log(`  - Progress: [${bar}]`);
    }

    if (sub.next_character_count_reset_unix) {
      const resetDate = new Date(sub.next_character_count_reset_unix * 1000);
      console.log('  - Resets on:', resetDate.toLocaleString());
    }

    console.log('  - Voice Limit:', sub.voice_limit || 'Unlimited');
    console.log('  - Can Extend Character Limit:', sub.can_extend_character_limit ? 'Yes' : 'No');
    console.log('  - Can Use Instant Voice Cloning:', sub.can_use_instant_voice_cloning ? 'Yes' : 'No');
    console.log('  - Can Use Professional Voice Cloning:', sub.can_use_professional_voice_cloning ? 'Yes' : 'No');
  }

  console.log('\n');
}

// Get usage limits and quotas
async function getUsageLimits() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 USAGE LIMITS & QUOTAS');
  console.log('='.repeat(60) + '\n');

  const user = await apiRequest('/user');

  if (!user) {
    console.log('❌ Failed to fetch usage information\n');
    return;
  }

  if (user.subscription) {
    const sub = user.subscription;

    console.log('CHARACTER USAGE:');
    console.log('  - Used:', (sub.character_count || 0).toLocaleString());
    console.log('  - Limit:', (sub.character_limit || 'Unlimited').toLocaleString ? sub.character_limit.toLocaleString() : sub.character_limit);
    console.log('  - Remaining:', sub.character_limit ? (sub.character_limit - sub.character_count).toLocaleString() : 'Unlimited');

    console.log('\nVOICE LIMITS:');
    console.log('  - Voice Limit:', sub.voice_limit || 'Unlimited');
    console.log('  - Professional Voice Cloning:', sub.professional_voice_limit || 0);

    console.log('\nFEATURES:');
    console.log('  - Can Use Delayed Payment Methods:', sub.can_use_delayed_payment_methods ? '✅' : '❌');
    console.log('  - Can Extend Character Limit:', sub.can_extend_character_limit ? '✅' : '❌');
    console.log('  - Can Extend Voice Limit:', sub.can_extend_voice_limit ? '✅' : '❌');
    console.log('  - Instant Voice Cloning:', sub.can_use_instant_voice_cloning ? '✅' : '❌');
    console.log('  - Professional Voice Cloning:', sub.can_use_professional_voice_cloning ? '✅' : '❌');
    console.log('  - Allowed to Extend Character Limit:', sub.allowed_to_extend_character_limit ? '✅' : '❌');
  }

  console.log('\n');
}

// List available models
async function getModels() {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AVAILABLE MODELS');
  console.log('='.repeat(60) + '\n');

  const models = await apiRequest('/models');

  if (!models) {
    console.log('❌ Failed to fetch models\n');
    return;
  }

  if (Array.isArray(models)) {
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name || 'Unnamed Model'}`);
      console.log(`   ID: ${model.model_id}`);

      if (model.description) {
        console.log(`   Description: ${model.description}`);
      }

      if (model.languages) {
        console.log(`   Languages: ${model.languages.length} supported`);
      }

      if (model.max_characters_request_free_user !== undefined) {
        console.log(`   Max Characters (Free): ${model.max_characters_request_free_user}`);
      }

      if (model.max_characters_request_subscribed_user !== undefined) {
        console.log(`   Max Characters (Subscribed): ${model.max_characters_request_subscribed_user}`);
      }

      console.log('');
    });

    console.log(`Total models: ${models.length}\n`);
  }
}

// List available voices
async function getVoices() {
  console.log('\n' + '='.repeat(60));
  console.log('🎤 AVAILABLE VOICES');
  console.log('='.repeat(60) + '\n');

  const data = await apiRequest('/voices');

  if (!data || !data.voices) {
    console.log('❌ Failed to fetch voices\n');
    return;
  }

  const voices = data.voices;

  // Group by category
  const premade = voices.filter(v => v.category === 'premade');
  const cloned = voices.filter(v => v.category === 'cloned');
  const professional = voices.filter(v => v.category === 'professional');

  console.log('PREMADE VOICES:');
  premade.forEach((voice, index) => {
    console.log(`  ${index + 1}. ${voice.name}`);
    console.log(`     ID: ${voice.voice_id}`);
    if (voice.labels) {
      const labels = Object.entries(voice.labels).map(([k, v]) => `${k}: ${v}`).join(', ');
      console.log(`     Labels: ${labels}`);
    }
  });

  if (cloned.length > 0) {
    console.log('\nCLONED VOICES:');
    cloned.forEach((voice, index) => {
      console.log(`  ${index + 1}. ${voice.name}`);
      console.log(`     ID: ${voice.voice_id}`);
    });
  }

  if (professional.length > 0) {
    console.log('\nPROFESSIONAL VOICES:');
    professional.forEach((voice, index) => {
      console.log(`  ${index + 1}. ${voice.name}`);
      console.log(`     ID: ${voice.voice_id}`);
    });
  }

  console.log(`\nTotal voices: ${voices.length} (${premade.length} premade, ${cloned.length} cloned, ${professional.length} professional)\n`);
}

// Get subscription history
async function getSubscriptionHistory() {
  console.log('\n' + '='.repeat(60));
  console.log('📜 SUBSCRIPTION HISTORY');
  console.log('='.repeat(60) + '\n');

  const history = await apiRequest('/user/subscription');

  if (!history) {
    console.log('❌ Failed to fetch subscription history\n');
    return;
  }

  console.log('Current Subscription Details:');
  console.log(JSON.stringify(history, null, 2));
  console.log('\n');
}

// Main execution
async function main() {
  const command = process.argv[2] || 'all';

  console.log('\n🎵 ElevenLabs API Information Tool');
  console.log('API Key:', ELEVENLABS_API_KEY.substring(0, 15) + '...\n');

  switch (command.toLowerCase()) {
    case 'user':
      await getUserInfo();
      break;

    case 'limits':
      await getUsageLimits();
      break;

    case 'models':
      await getModels();
      break;

    case 'voices':
      await getVoices();
      break;

    case 'history':
      await getSubscriptionHistory();
      break;

    case 'all':
    default:
      await getUserInfo();
      await getUsageLimits();
      await getModels();
      await getVoices();
      break;
  }

  console.log('✅ Done!\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
