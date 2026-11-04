import CustomerLayout from '@/components/customer-layout';
import { getSettings } from '@/lib/store';
export const metadata = { title: 'Terms of Service' };
export const dynamic = 'force-dynamic';
export default async function Terms() {
  const s = await getSettings();
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <h1 className="serif" style={{ fontSize: 52 }}>
            Terms of Service
          </h1>
          <p className="sub" style={{ margin: '20px 0 40px' }}>
            Draft for business review — replace with your verified rental contract before launch.
          </p>
          <h2>Rental enquiries</h2>
          <p>
            Website prices are indicative until confirmed by {s.businessName}. Clicking the WhatsApp
            button or submitting an enquiry does not reserve a vehicle or establish a rental
            agreement.
          </p>
          <h2 style={{ marginTop: 28 }}>Requirements and charges</h2>
          <p>
            Identity verification, driver eligibility, licenses, fuel policies, permits, extra
            kilometers, late returns, insurance exclusions, security deposits and damage
            responsibility must be agreed with the business before payment or pickup.
          </p>
          <h2 style={{ marginTop: 28 }}>Availability</h2>
          <p>
            Vehicle models and availability may change. Confirm the exact vehicle, conditions, dates
            and pickup arrangements directly with staff.
          </p>
          <h2 style={{ marginTop: 28 }}>Contact</h2>
          <p>
            For questions call {s.phoneNumber} or email {s.contactEmail}.
          </p>
        </div>
      </section>
    </CustomerLayout>
  );
}
