"""STT post-processing using local LLM to fix hallucinations."""

import logging

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "คุณเป็นระบบแก้ไขข้อความจาก Speech-to-Text\n"
    "คุณจะได้รับข้อความภาษาไทยที่อาจมีข้อผิดพลาดจากการแปลงเสียงเป็นข้อความ\n\n"
    "หน้าที่ของคุณ:\n"
    "1. แก้คำที่ฟังผิด/สะกดผิด\n"
    "2. ลบข้อความที่ถูกแต่งขึ้นมา (hallucination) เช่น คำปิดท้าย YouTube\n"
    "3. ลบคำซ้ำที่ไม่จำเป็น\n"
    "4. ถ้าข้อความทั้งหมดเป็น hallucination ให้ตอบว่างเปล่า\n\n"
    "กฎ:\n"
    "- ตอบเฉพาะข้อความไทยที่แก้แล้วเท่านั้น ไม่ต้องอธิบาย\n"
    "- ห้ามแปลภาษา\n"
    "- ห้ามเพิ่มข้อความที่ไม่มีในต้นฉบับ\n"
    "- แก้เท่าที่จำเป็น ให้ใกล้ต้นฉบับมากที่สุด"
)


class SttPostProcessor:
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.model = None
        self.tokenizer = None

    def load(self):
        """Load small local LLM for post-processing."""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch

            model_name = "Qwen/Qwen3-4B-Instruct-2507"
            logger.info("Loading STT post-processor: %s", model_name)

            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            ).to(self.device)
            self.model.eval()

            logger.info("STT post-processor loaded on %s", self.device)
        except Exception as e:
            logger.warning("STT post-processor not available: %s", e)

    def process(self, text: str, audio_duration: float = 0) -> str:
        """Clean up STT output using local LLM."""
        if not text.strip() or self.model is None:
            return text

        try:
            import torch

            messages = [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": "เสียงยาว %.1f วินาที\nข้อความ: %s" % (audio_duration, text)},
            ]

            input_text = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=128,
                    temperature=0.1,
                    do_sample=False,
                    repetition_penalty=1.3,
                )

            # Decode only the new tokens
            new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
            result = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

            # If LLM returns empty or garbage, keep original
            if not result or len(result) > len(text) * 3:
                return text

            if result != text:
                logger.info("STT postprocess: '%s' -> '%s'", text[:60], result[:60])

            return result
        except Exception as e:
            logger.warning("STT postprocess failed: %s", e)
            return text
