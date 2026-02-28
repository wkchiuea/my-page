import React from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config/config.json';
import '../ArticlePage.css';
import './AboutPage.css';

function AboutPage() {
  const navigate = useNavigate();
  const { skills = [], certifications = [], languages = [] } = config.aboutPage || {};

  return (
    <div className="about-page">
      <div className="about-container">
        <button onClick={() => navigate('/')} className="back-button">← Back to Home</button>

        <header className="about-hero">
          <div className="about-hero-inner">
            <h1 className="about-name">Louis Chiu</h1>
            <p className="about-tagline">Software Developer · Fullstack</p>
          </div>
        </header>

        <section className="about-section">
          <h2 className="about-section-title">Introduction</h2>
          <div className="about-intro">
            <p>
              I'm a fullstack software developer with experience across web systems, trading platforms, and AI applications. I hold an <strong>MSc in Computer Science</strong> from the University of Hong Kong and a <strong>BSc in Physics</strong> from HKUST.
            </p>
            <p>
              I've worked on a variety of projects: banking web systems, trading platforms, and AI chatbots. I've also been involved in QA and built automation for UI and business-logic testing. I enjoy learning new things in my spare time—both technical and beyond—and I'm currently focusing on <strong>AWS certifications</strong> and <strong>project management</strong>.
            </p>
            <p className="about-closing">
              I value solid engineering, clear communication, and building software that is reliable and maintainable—and I like working with teams who care about the same.
            </p>
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">Skills</h2>
          <div className="about-skills">
            {skills.map((group) => (
              <div key={group.title} className="about-skill-card">
                <h3 className="about-skill-title">{group.title}</h3>
                <ul className="about-skill-list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">Certifications</h2>
          <div className="about-cert-wrap">
            {certifications.map((cert) => (
              <span key={cert} className="about-cert-badge">{cert}</span>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">Language</h2>
          <div className="about-lang-grid">
            {languages.map(({ name, level }) => (
              <div key={name} className="about-lang-card">
                <span className="about-lang-name">{name}</span>
                <span className="about-lang-level">{level}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AboutPage;
