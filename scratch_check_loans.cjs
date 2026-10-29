const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('loans').select('*').eq('status', 'Active');
  if (error) {
    console.error(error);
    return;
  }
  
  const now = new Date();
  const pastDue = data.filter(l => new Date(l.due_date) < now);
  console.log(`There are ${pastDue.length} active loans past their due date.`);
  
  pastDue.forEach(l => {
    console.log(`- Loan ${l.id} due on ${l.due_date}`);
  });
}

check();
