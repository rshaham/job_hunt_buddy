# Running with Local or HuggingFace Models

Career Forager supports running with local AI models via Ollama or any OpenAI-compatible endpoint, including HuggingFace Inference Endpoints.

## Option 1: Ollama (Recommended for Local)

[Ollama](https://ollama.ai) is the easiest way to run LLMs locally on your machine.

### Setup

1. **Install Ollama**
   - Download from [ollama.ai](https://ollama.ai)
   - macOS: `brew install ollama`
   - Windows: Download installer from website
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

2. **Pull a Model**
   ```bash
   # Recommended models for job hunting tasks:
   ollama pull llama3.2        # Meta's latest, good balance
   ollama pull mistral         # Fast and capable
   ollama pull qwen2.5         # Strong reasoning
   ollama pull llama3.2:70b    # Best quality (requires 48GB+ RAM)
   ```

3. **Start Ollama Server**
   ```bash
   ollama serve
   ```
   The server runs at `http://localhost:11434` by default.

4. **Configure Career Forager**
   - Open Settings > API tab
   - Select "Local / OpenAI-Compatible" from the provider dropdown
   - Server URL: `http://localhost:11434/v1` (default)
   - API Key: Leave empty
   - Model: Select from dropdown or enter custom model name
   - Click "Test & Save"

### Recommended Models by Task

| Task | Minimum Model | Best Quality |
|------|--------------|--------------|
| JD Analysis | llama3.2 (8B) | llama3.2:70b |
| Resume Grading | mistral (7B) | qwen2.5:32b |
| Cover Letters | llama3.2 (8B) | llama3.2:70b |
| Interview Prep | qwen2.5 (7B) | llama3.2:70b |

### Troubleshooting

**"Connection Failed" error:**
- Ensure Ollama is running: `ollama serve`
- Check the server URL ends with `/v1`
- Try `http://127.0.0.1:11434/v1` if localhost doesn't work

**Slow responses:**
- Smaller models (7B-8B) run faster
- Consider models with quantization: `llama3.2:8b-q4_0`
- Ensure no other heavy applications are running

---

## Option 2: LM Studio

[LM Studio](https://lmstudio.ai) provides a GUI for running local models.

### Setup

1. Download and install from [lmstudio.ai](https://lmstudio.ai)
2. Download a model through the app (e.g., Llama 3.2, Mistral)
3. Start the local server (usually on port 1234)
4. Configure Career Forager:
   - Provider: "Local / OpenAI-Compatible"
   - Server URL: `http://localhost:1234/v1`
   - Model: Enter the model name as shown in LM Studio

---

## Option 3: HuggingFace Inference Endpoints

Use HuggingFace's hosted models for a cloud-based solution without Anthropic/Google.

### Free Inference API (Rate Limited)

1. Get a free API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Configure Career Forager:
   - Provider: "Local / OpenAI-Compatible"
   - Server URL: `https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-8B-Instruct/v1`
   - API Key: Your HuggingFace token (`hf_...`)
   - Model: `tgi` (or the model name)

### Dedicated Inference Endpoints (Paid)

For production use with better performance:

1. Create an endpoint at [huggingface.co/inference-endpoints](https://huggingface.co/inference-endpoints)
2. Choose a model (e.g., `meta-llama/Llama-3.2-8B-Instruct`)
3. Select instance type and region
4. Configure Career Forager:
   - Server URL: Your endpoint URL + `/v1`
   - API Key: Your HuggingFace token
   - Model: The model name

### Recommended HuggingFace Models

- `meta-llama/Llama-3.2-8B-Instruct` - Good all-rounder
- `mistralai/Mistral-7B-Instruct-v0.3` - Fast responses
- `Qwen/Qwen2.5-7B-Instruct` - Strong reasoning

---

## Option 4: Other OpenAI-Compatible APIs

Any service that implements the OpenAI Chat Completions API format will work:

- **Together.ai**: `https://api.together.xyz/v1`
- **Groq**: `https://api.groq.com/openai/v1`
- **Anyscale**: `https://api.endpoints.anyscale.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`

Configure with the appropriate server URL and API key from the provider.

---

## Model Requirements

For best results with job hunting tasks, your model should:

- Support at least 4096 context tokens (8192+ preferred)
- Be instruction-tuned (not a base model)
- Have strong reasoning capabilities

**Minimum specs for local models:**
- 7B model: 8GB RAM
- 13B model: 16GB RAM
- 70B model: 48GB+ RAM (or use quantized versions)

---

## Comparison: Local vs Cloud

| Aspect | Local (Ollama) | Cloud (HuggingFace) | Anthropic/Gemini |
|--------|---------------|---------------------|------------------|
| Privacy | Best - data never leaves your machine | Good - depends on provider | Data sent to API |
| Speed | Depends on hardware | Fast | Fast |
| Cost | Free (electricity) | Free tier / Pay-per-use | Pay-per-use |
| Quality | Good with larger models | Good | Best |
| Setup | Medium | Easy | Easy |
