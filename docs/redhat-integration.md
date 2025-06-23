# Red Hat Integration Guide

This document outlines how the Moodle Scraper leverages Red Hat's enterprise-grade open source technologies to provide secure, scalable, and production-ready containerized web scraping capabilities.

## 🎯 Why Red Hat Technologies?

This integration demonstrates understanding of enterprise-grade open source solutions that are widely adopted in Fortune 500 companies:

- **Security-First Approach**: Red Hat's focus on secure, hardened containers
- **Enterprise Support**: Production-ready tools with long-term support
- **Cloud-Native**: Technologies designed for hybrid cloud environments
- **Open Source Leadership**: Contributing to and leading major open source projects

## 🛠️ Integrated Red Hat Technologies

### 1. Red Hat Universal Base Images (UBI)

**What it is**: Enterprise-grade, freely redistributable container base images built on Red Hat Enterprise Linux.

**Why we use it**:
- **Security**: Regular security updates and vulnerability scanning
- **Compliance**: Meets enterprise security and compliance requirements
- **Reliability**: Battle-tested in production environments
- **Support**: Backed by Red Hat's enterprise support

**Implementation**: Our `Dockerfile` uses `registry.access.redhat.com/ubi9/nodejs-18:latest`

```dockerfile
FROM registry.access.redhat.com/ubi9/nodejs-18:latest
```

### 2. Podman Container Engine

**What it is**: A daemonless, rootless container engine that's OCI-compliant and Docker-compatible.

**Why we use it**:
- **Security**: Rootless containers by default (no privileged daemon)
- **Compatibility**: Drop-in replacement for Docker commands
- **Integration**: Native integration with systemd and Kubernetes
- **Performance**: Lower resource overhead without daemon

**Key Features Demonstrated**:
- Rootless container execution
- SELinux integration (`:Z` mount flags)
- Resource limits and security constraints
- Interactive debugging capabilities

### 3. Security Hardening

**Enterprise Security Practices**:
- No-new-privileges security option
- Capability dropping (`--cap-drop ALL`)
- Read-only root filesystem
- Non-root user execution (UID 1001)
- SELinux context preservation

**Example Security Configuration**:
```bash
podman run \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --read-only \
  --tmpfs /tmp \
  -v output:/app/output:Z \
  moodle-scraper:latest
```

## 🚀 Getting Started

### Prerequisites

1. **Install Podman**:
   ```bash
   # RHEL/CentOS/Fedora
   sudo dnf install podman
   
   # Ubuntu/Debian
   sudo apt-get install podman
   
   # macOS
   brew install podman
   podman machine init
   podman machine start
   ```

2. **Verify Installation**:
   ```bash
   podman --version
   podman info
   ```

### Quick Start

1. **Build the Container**:
   ```bash
   npm run container:build
   ```

2. **Run Scraping in Container**:
   ```bash
   export MOODLE_EMAIL="your-email@university.edu"
   export MOODLE_PASSWORD="your-password"
   export MOODLE_CLASS_URL="https://moodle.university.edu/course/view.php?id=12345"
   
   npm run container:run
   ```

3. **Debug Interactive Container**:
   ```bash
   npm run container:debug
   ```

## 🔧 Advanced Usage

### Container Management

```bash
# Build with custom tag
podman build -t my-moodle-scraper:v1.0 .

# Run with custom configuration
podman run --rm \
  -e MOODLE_EMAIL="user@example.com" \
  -e MOODLE_PASSWORD="password" \
  -e MOODLE_CLASS_URL="https://moodle.example.com/course/view.php?id=123" \
  -v $(pwd)/output:/app/output:Z \
  my-moodle-scraper:v1.0

# Inspect container image
podman inspect my-moodle-scraper:v1.0

# View container logs
podman logs moodle-scraper
```

### Security Scanning

```bash
# Scan for vulnerabilities (requires additional tools)
podman run --rm -v $(pwd):/app:Z \
  quay.io/redhatproductsecurity/openscap \
  oscap-podman \
  oval eval \
  --report /app/security-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-oval.xml \
  moodle-scraper:latest
```

### Production Deployment

For production deployments, consider:

1. **Red Hat OpenShift**: Deploy containers to enterprise Kubernetes platform
2. **Red Hat Enterprise Linux**: Run on RHEL hosts with support
3. **Red Hat OpenShift AI**: Integrate with AI/ML workflows
4. **Red Hat Quay**: Store containers in enterprise registry

## 🏗️ Architecture Benefits

### For Developers

- **Consistent Environment**: Same runtime locally and in production
- **Debugging**: Interactive container debugging with full toolchain
- **Security**: Built-in security best practices
- **Portability**: Run anywhere Podman/Docker is available

### For DevOps/Platform Teams

- **Rootless**: Enhanced security without privileged containers
- **Systemd Integration**: Native service management
- **Kubernetes Ready**: Easy migration to OpenShift/Kubernetes
- **Compliance**: Meets enterprise security requirements

### For Organizations

- **Enterprise Support**: Red Hat enterprise support available
- **Security Auditing**: Regular security updates and CVE tracking
- **Compliance**: Meets industry standards (SOC2, FedRAMP, etc.)
- **Hybrid Cloud**: Deploy consistently across environments

## 🔍 Troubleshooting

### Common Issues

1. **SELinux Contexts**:
   ```bash
   # If volume mounts fail, use :Z flag
   -v $(pwd)/output:/app/output:Z
   ```

2. **Permissions**:
   ```bash
   # Ensure output directory is writable
   mkdir -p output
   chmod 755 output
   ```

3. **Podman Machine (macOS)**:
   ```bash
   # If containers won't start on macOS
   podman machine stop
   podman machine start
   ```

### Debugging

```bash
# Run interactive shell in container
podman run -it --rm \
  --name moodle-debug \
  moodle-scraper:latest \
  /bin/bash

# Inside container, test components
node -e "console.log(require('./dist/index.js'))"
```

## 🎓 Learning Resources

### Red Hat Developer

- [Red Hat Developer Program](https://developers.redhat.com/) - Free access to Red Hat technologies
- [Podman Desktop](https://podman-desktop.io/) - GUI for Podman containers
- [Red Hat Universal Base Images](https://www.redhat.com/en/blog/introducing-red-hat-universal-base-image) - Learn about UBI

### Training and Certification

- [Red Hat Container Training](https://www.redhat.com/en/services/training/do188-red-hat-openshift-development-i-containerizing-applications)
- [Podman Documentation](https://docs.podman.io/)
- [OpenShift Learning Path](https://learn.openshift.com/)

## 🚀 Next Steps

### Integration Opportunities

1. **Red Hat OpenShift AI**: Deploy for AI-powered data analysis
2. **Red Hat Ansible**: Automate deployment and configuration
3. **Red Hat OpenShift**: Scale to production Kubernetes environment
4. **Red Hat Quay**: Store containers in enterprise registry

### Advanced Features

- **CI/CD Integration**: Use with Red Hat OpenShift Pipelines
- **Monitoring**: Integrate with Red Hat OpenShift monitoring
- **Security**: Advanced scanning with Red Hat Advanced Cluster Security

## 📞 Getting Help

- **Red Hat Developer Support**: [developers.redhat.com](https://developers.redhat.com/)
- **Podman Community**: [podman.io/community](https://podman.io/community/)
- **GitHub Issues**: Report issues with this integration

---

**Note**: This integration showcases enterprise-grade containerization practices using Red Hat's open source technologies. It demonstrates understanding of security-first development, container best practices, and production-ready deployment strategies that are valued in enterprise environments. 