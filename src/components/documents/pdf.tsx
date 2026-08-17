import { Document, Link, Page, StyleSheet, Text } from "@react-pdf/renderer";
import { linkHref } from "@/lib/job/documents";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contact: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 4,
  },
  contactLink: {
    fontSize: 9,
    color: "#2563eb",
    marginTop: 4,
    textDecoration: "underline",
  },
  heading: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 2,
  },
  bullet: {
    marginLeft: 10,
  },
  paragraph: {
    marginBottom: 4,
  },
  bodyLink: {
    color: "#2563eb",
    textDecoration: "underline",
  },
});

type CvHeader = {
  fullName: string | null;
  title: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
};

export function CvDocument({ text, header }: { text: string; header: CvHeader }) {
  const contactParts = [
    { value: header.title, href: null },
    { value: header.location, href: null },
    { value: header.email, href: header.email ? `mailto:${header.email}` : null },
    { value: header.phone, href: null },
    { value: header.github, href: header.github ? linkHref(header.github) : null },
    { value: header.linkedin, href: header.linkedin ? linkHref(header.linkedin) : null },
  ].filter((part): part is { value: string; href: string | null } => Boolean(part.value));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {header.fullName && <Text style={styles.name}>{header.fullName}</Text>}
        {contactParts.map((part, i) => (
          <Text key={i} style={part.href ? styles.contactLink : styles.contact}>
            {part.href ? (
              <Link src={part.href}>{part.value}</Link>
            ) : (
              part.value
            )}
          </Text>
        ))}
        {text.split(/\r?\n/).map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          const heading = /^##\s+(.+)$/.exec(trimmed);
          if (heading) {
            return (
              <Text key={i} style={styles.heading}>
                {heading[1]}
              </Text>
            );
          }
          const href = linkHref(trimmed);
          const textNode = trimmed.startsWith("- ")
            ? trimmed.slice(2)
            : trimmed;
          if (href) {
            return (
              <Text key={i} style={[styles.paragraph, styles.bodyLink]}>
                <Link src={href}>{textNode}</Link>
              </Text>
            );
          }
          if (trimmed.startsWith("- ")) {
            return (
              <Text key={i} style={[styles.paragraph, styles.bullet]}>
                {textNode}
              </Text>
            );
          }
          return (
            <Text key={i} style={styles.paragraph}>
              {textNode}
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

export function CoverLetterDocument({ text }: { text: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {text
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
      </Page>
    </Document>
  );
}