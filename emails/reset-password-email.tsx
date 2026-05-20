import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  url: string;
}

export function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for SecureGate</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>SecureGate</Heading>
          <Heading as="h2" style={subheading}>
            Reset your password
          </Heading>
          <Text style={paragraph}>
            We received a request to reset your password. Click the button below
            to set a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button href={url} style={button}>
              Reset password
            </Button>
          </Section>
          <Text style={expiry}>
            This link expires in 1 hour. If you did not request a password reset,
            you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  backgroundColor: "hsl(90, 29%, 97%)",
  padding: "40px 20px",
};

const container = {
  maxWidth: 480,
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: 8,
  padding: "40px 32px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
};

const heading = {
  fontSize: 24,
  fontWeight: 700,
  color: "hsl(140, 6%, 10%)",
  margin: "0 0 4px",
  padding: 0,
};

const subheading = {
  fontSize: 18,
  fontWeight: 600,
  color: "hsl(130, 4%, 27%)",
  margin: "0 0 20px",
  padding: 0,
};

const paragraph = {
  fontSize: 15,
  lineHeight: "24px",
  color: "hsl(130, 4%, 27%)",
  margin: "0 0 24px",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: 24,
};

const button = {
  backgroundColor: "hsl(148, 100%, 38%)",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const expiry = {
  fontSize: 13,
  color: "hsl(129, 3%, 46%)",
  margin: 0,
  textAlign: "center" as const,
};
