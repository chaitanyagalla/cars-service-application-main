import CustomerLayout from '@/components/customer-layout';
import { getFaqs } from '@/lib/store';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Frequently Asked Questions' };
export default async function FaqPage() {
  const faqs = await getFaqs();
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">FAQ</span>
            <h1 className="display" style={{ fontSize: 55 }}>
              Common <span className="text-accent">Questions</span>
            </h1>
            <p className="sub">Everything you need to know before submitting an enquiry.</p>
          </div>
          <div className="faq-list">
            {faqs.map((q, i) => (
              <details className="panel faq-item" key={q.id} open={i === 0}>
                <summary>{q.question}</summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
