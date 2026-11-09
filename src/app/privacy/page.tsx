import CustomerLayout from '@/components/customer-layout';
import { getSettings } from '@/lib/store';
export const metadata = { title: 'Privacy Policy' };
export const dynamic = 'force-dynamic';
export default async function Privacy() {
  const s = await getSettings();
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <h1 className="display" style={{ fontSize: 52 }}>
            Privacy Policy
          </h1>
          <p className="sub" style={{ margin: '20px 0 40px' }}>
            Draft for business review. This policy must be reviewed and customized before launch.
          </p>
          <h2>Staff login</h2>
          <p>
            Authorized staff sign in with their assigned email and password. We store password
            hashes and use a secure session cookie to protect the admin area. Public visitors can
            browse cars and submit enquiries without an account.
          </p>
          <h2 style={{ marginTop: 28 }}>Booking enquiries</h2>
          <p>
            When you submit the enquiry form, we collect your name, contact number, preferred pickup
            area, optional dates, and your notes so our team can respond to your rental request.
            These details are stored in our database and visible to authorized staff.
          </p>
          <h2 style={{ marginTop: 28 }}>WhatsApp</h2>
          <p>
            When you choose WhatsApp, your browser opens a third-party service with a prewritten
            message. You choose whether to send it. WhatsApp has its own privacy terms.
          </p>
          <h2 style={{ marginTop: 28 }}>Map content</h2>
          <p>
            The website embeds a Google map. Loading it may share browsing information with Google
            under its terms.
          </p>
          <h2 style={{ marginTop: 28 }}>Your questions</h2>
          <p>
            Contact {s.contactEmail} for enquiries about your stored information. The business
            should specify retention periods, deletion rights, data transfers and applicable law
            before publishing this policy.
          </p>
        </div>
      </section>
    </CustomerLayout>
  );
}
