import { useMemo, useState, type FormEvent } from "react";
import { Footer } from "../components/Footer";
import { CREATIVE_FIELDS, CREATIVE_SERVICES_BY_FIELD, PHONE_COUNTRY_CODES } from "./creativeTaxonomy";
import "../creativeIntake/creativeIntake.css";
import "./supplierIntake.css";

// Public "join our network" supplier intake form (Sept 2026). Replaces
// riyadh-winter-2026.netlify.app/supplier-intake.html — same audience
// (creatives who aren't in the CRM yet, self-submitting cold, as opposed
// to CreativeIntakePage's personalized follow-up for people already on
// file), same submission destination, same field taxonomy. Only the
// look changed: that page had its own dark/gold visual language with no
// connection to anything else Basa Studio / Book a Street Artist sends,
// which is exactly what caused the confusion around the Sept 10 "Join
// our network" send — this one shares the Lamha brand tokens and the
// .intake-* shell so every link from us reads as the same team, and
// leads with the "Basa Studio — Berlin · Riyadh" identity line instead
// of burying it in the footer.
//
// The submission POST target and payload shape are intentionally
// unchanged from the old page (see API_BASE below) — the review process
// on the other end (Mario manually promoting entries from
// supplier-submissions-pending into Folk) doesn't need to change for
// this migration, only the page people fill in.

const API_BASE = "https://riyadh-planner.juicy-415.workers.dev";

function uid() {
  return "s" + Math.random().toString(36).slice(2, 9);
}

interface SupplierSubmission {
  id: string;
  legalName: string;
  stageName: string;
  name: string;
  types: string[];
  specialty: string[];
  photo: string;
  website: string;
  social: string;
  link: string;
  about: string;
  tech: string;
  price: string;
  status: "Pending";
  note: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: boolean;
  submittedViaForm: true;
  reviewed: false;
  submittedAt: string;
}

export function SupplierIntakePage() {
  const [legalName, setLegalName] = useState("");
  const [stageName, setStageName] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [serviceSearch, setServiceSearch] = useState("");
  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [social, setSocial] = useState("");
  const [tech, setTech] = useState("");
  const [price, setPrice] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+966");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState<boolean | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fieldsInOrder = useMemo(() => CREATIVE_FIELDS.filter((f) => selectedFields.has(f)), [selectedFields]);

  const query = serviceSearch.trim().toLowerCase();

  function toggleField(field: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function toggleService(service: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const legal = legalName.trim();
    const aboutTrim = about.trim();
    const techTrim = tech.trim();
    const priceTrim = price.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    const websiteTrim = website.trim();
    const socialTrim = social.trim();
    const types = fieldsInOrder;
    const specialty = Array.from(selectedServices);

    if (!legal || !aboutTrim || !techTrim || !priceTrim || !emailTrim || !phoneTrim) {
      setError("Please fill in all required fields.");
      return;
    }
    if (types.length === 0) {
      setError("Please select at least one Creative Field.");
      return;
    }
    if (specialty.length === 0) {
      setError("Please select at least one Creative Service.");
      return;
    }
    if (!websiteTrim && !socialTrim) {
      setError("Please provide at least a website or a social media link.");
      return;
    }

    const submission: SupplierSubmission = {
      id: uid(),
      legalName: legal,
      stageName: stageName.trim(),
      name: stageName.trim() || legal,
      types: types.slice(0, 3),
      specialty,
      photo: "",
      website: websiteTrim,
      social: socialTrim,
      link: socialTrim || websiteTrim,
      about: aboutTrim,
      tech: techTrim,
      price: priceTrim,
      status: "Pending",
      note: "",
      contactEmail: emailTrim,
      contactPhone: `${phoneCode} ${phoneTrim}`,
      whatsapp: whatsapp === true,
      submittedViaForm: true,
      reviewed: false,
      submittedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/append/supplier-submissions-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong submitting your application. Please try again in a moment.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="intake-page">
        <div className="intake-content">
          <div className="card intake-card intake-welcome">
            <p className="intake-eyebrow">Application received</p>
            <h1 style={{ marginBottom: 8 }}>Thanks for joining!</h1>
            <p style={{ opacity: 0.78, fontSize: "1.02rem" }}>
              Our team will review your submission and reach out if there's a fit for an upcoming project or
              activation.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="intake-page">
      <div className="intake-content">
        <div className="card intake-card supplier-card">
          <p className="intake-eyebrow">Basa Studio — Berlin · Riyadh</p>
          <h1 style={{ marginBottom: 8 }}>Join our network of creatives.</h1>
          <p style={{ opacity: 0.78, fontSize: "1.02rem", marginBottom: 28 }}>
            Submit your information to get considered for upcoming projects and activations in KSA and the Gulf
            region.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="supplier-field-row">
              <div className="supplier-field">
                <label>
                  Your name <span className="supplier-req">*</span>
                </label>
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div className="supplier-field">
                <label>
                  Artist / studio / group / band name <span className="supplier-hint">If different from above</span>
                </label>
                <input value={stageName} onChange={(e) => setStageName(e.target.value)} />
              </div>
            </div>

            <div className="supplier-field">
              <label>
                Creative Field <span className="supplier-req">*</span>{" "}
                <span className="supplier-hint" style={{ display: "inline" }}>
                  Select all that apply
                </span>
              </label>
              <div className="supplier-type-grid">
                {CREATIVE_FIELDS.map((field) => (
                  <label key={field} className={`supplier-type-option${selectedFields.has(field) ? " checked" : ""}`}>
                    <input type="checkbox" checked={selectedFields.has(field)} onChange={() => toggleField(field)} />
                    <span>{field}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="supplier-field">
              <label>
                Creative Service <span className="supplier-req">*</span>{" "}
                <span className="supplier-hint" style={{ display: "inline" }}>
                  Select at least one, based on the Creative Field(s) above
                </span>
              </label>
              <input
                type="text"
                className="supplier-specialty-search"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
              {fieldsInOrder.length === 0 ? (
                <p className="supplier-specialty-empty-hint">
                  Select a Creative Field above first — we'll show the matching services here.
                </p>
              ) : (
                fieldsInOrder.map((field) => {
                  const services = CREATIVE_SERVICES_BY_FIELD[field] ?? [];
                  const visible = query ? services.filter((s) => s.toLowerCase().includes(query)) : services;
                  if (query && visible.length === 0) return null;
                  return (
                    <div key={field} className="supplier-specialty-group">
                      <p className="supplier-specialty-group-title">{field}</p>
                      <div className="supplier-specialty-grid">
                        {services.map((svc) => (
                          <label
                            key={svc}
                            className={`supplier-specialty-option${selectedServices.has(svc) ? " checked" : ""}${
                              query && !svc.toLowerCase().includes(query) ? " hidden-by-search" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedServices.has(svc)}
                              onChange={() => toggleService(svc)}
                            />
                            <span>{svc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <hr className="supplier-divider" />

            <div className="supplier-field">
              <label>
                Tell us more about your work <span className="supplier-req">*</span>
                <span className="supplier-hint">
                  Include techniques, materials, special references, or any information about origin or inspiration
                  of your work.
                </span>
              </label>
              <textarea rows={3} value={about} onChange={(e) => setAbout(e.target.value)} />
            </div>

            <div className="supplier-field-row">
              <div className="supplier-field">
                <label>Website</label>
                <input placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="supplier-field">
                <label>Social media link</label>
                <input
                  placeholder="instagram.com/..."
                  value={social}
                  onChange={(e) => setSocial(e.target.value)}
                />
              </div>
            </div>
            <p className="supplier-note">At least one of website or social media link is required.</p>

            <div className="supplier-field">
              <label>
                What are your technical requirements? <span className="supplier-req">*</span>
                <span className="supplier-hint">
                  List any equipment, space, crew, power, or other technical specs you require.
                </span>
              </label>
              <textarea rows={3} value={tech} onChange={(e) => setTech(e.target.value)} />
            </div>

            <div className="supplier-field">
              <label>
                Describe your standard services and their estimated price range <span className="supplier-req">*</span>
                <span className="supplier-hint">
                  Include the types of projects you typically work on and a general price range.
                </span>
              </label>
              <textarea rows={3} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="supplier-field-row">
              <div className="supplier-field">
                <label>
                  Your email address <span className="supplier-req">*</span>
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="supplier-field">
                <label>
                  Your phone number <span className="supplier-req">*</span>
                </label>
                <div className="supplier-phone-row">
                  <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
                    {PHONE_COUNTRY_CODES.map((c, i) => (
                      <option key={`${c.code}-${i}`} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input placeholder="5X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="supplier-field">
              <label>Do you use WhatsApp for business inquiries?</label>
              <div className="supplier-yn-row">
                <div
                  className={`supplier-yn-option${whatsapp === true ? " selected" : ""}`}
                  onClick={() => setWhatsapp(true)}
                >
                  Yes
                </div>
                <div
                  className={`supplier-yn-option${whatsapp === false ? " selected" : ""}`}
                  onClick={() => setWhatsapp(false)}
                >
                  No
                </div>
              </div>
            </div>

            <div className="supplier-submit-row">
              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
              {error && <p className="supplier-error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
