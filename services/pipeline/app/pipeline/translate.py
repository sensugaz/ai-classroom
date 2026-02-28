"""MarianMT translation (opus-mt-th-en) — fast, accurate, no hallucination."""

import logging

logger = logging.getLogger(__name__)


class TranslateProcessor:
    def __init__(self, model_name: str = "Helsinki-NLP/opus-mt-th-en", device: str = "cuda"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.tokenizer = None

    def load(self):
        """Load MarianMT model."""
        from transformers import MarianMTModel, MarianTokenizer
        import torch

        self.tokenizer = MarianTokenizer.from_pretrained(self.model_name)
        self.model = MarianMTModel.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        ).to(self.device)
        self.model.eval()
        logger.info("MarianMT %s loaded on %s", self.model_name, self.device)

    def translate(self, text: str, source_lang: str = "th", target_lang: str = "en") -> str:
        """Translate Thai to English."""
        if not text.strip():
            return ""

        if self.model is None:
            raise RuntimeError("Translation model not loaded")

        import torch

        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True).to(self.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                num_beams=2,
                max_new_tokens=128,
                repetition_penalty=1.5,
                no_repeat_ngram_size=3,
            )

        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Post-process: remove repetition
        result = self._remove_repetition(result)

        logger.debug("Translate: %s -> %s", text, result)
        return result

    @staticmethod
    def _remove_repetition(text: str) -> str:
        """Remove repeated phrases that indicate hallucination."""
        words = text.split()
        if len(words) <= 4:
            return text

        for n in range(2, 6):
            if len(words) < n * 2:
                continue
            for i in range(len(words) - n):
                phrase = words[i:i + n]
                repeats = 1
                j = i + n
                while j + n <= len(words) and words[j:j + n] == phrase:
                    repeats += 1
                    j += n
                if repeats >= 3:
                    logger.warning("Hallucination detected: '%s' repeated %dx, truncating",
                                   " ".join(phrase), repeats)
                    return " ".join(words[:i + n])
        return text
