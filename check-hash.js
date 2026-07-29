require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data } = await supabase.from('users').select('username, password_hash').limit(5);
  console.log(data);
  if (data && data.length > 0) {
    const hash = data[0].password_hash;
    console.log('Hash starts with:', hash.substring(0, 7));
    // The cost is typically the number after the second $
    // e.g. $2a$06$ -> cost 6
    console.time('compare');
    const res = await bcrypt.compare('password123', hash);
    console.timeEnd('compare');
    console.log('Valid:', res);
  }
}

check();
