const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: clubs } = await supabase.from('clubs').select('*').limit(1);
  console.log('Clubs columns:', clubs && clubs[0] ? Object.keys(clubs[0]) : 'no data');
  
  const { data: members } = await supabase.from('club_members').select('*').limit(1);
  console.log('Club members columns:', members && members[0] ? Object.keys(members[0]) : 'no data or error');
}
check();
