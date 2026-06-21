import os
import shutil
import logging
import boto3
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL") # Used for Cloudflare R2 or custom S3 endpoints
REGION_NAME = os.getenv("AWS_REGION", "ap-south-1")

# Local storage directories as fallbacks
LOCAL_STORAGE_DIR = "static/uploads"
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(LOCAL_STORAGE_DIR, "photos"), exist_ok=True)
os.makedirs(os.path.join(LOCAL_STORAGE_DIR, "searches"), exist_ok=True)

class StorageManager:
    def __init__(self):
        self.use_s3 = all([BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY])
        self.s3_client = None
        
        if self.use_s3:
            logger.info("S3/R2 credentials detected. Initializing storage driver.")
            try:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    endpoint_url=ENDPOINT_URL,
                    region_name=REGION_NAME
                )
            except Exception:
                logger.exception("Error initializing S3 client. Falling back to local storage.")
                self.use_s3 = False
        else:
            logger.info("S3/R2 credentials missing. Using local storage manager.")

    def upload_file(self, file_path_or_bytes, destination_key: str, is_path: bool = False) -> str:
        """
        Uploads a file to S3/R2 or stores it in local static directory.
        Returns the public/accessible URL of the stored file.
        """
        if self.use_s3:
            try:
                if is_path:
                    self.s3_client.upload_file(file_path_or_bytes, BUCKET_NAME, destination_key)
                else:
                    self.s3_client.put_object(Bucket=BUCKET_NAME, Key=destination_key, Body=file_path_or_bytes)
                
                # Construct public S3 URL (use custom endpoint if provided)
                if ENDPOINT_URL:
                    return f"{ENDPOINT_URL}/{BUCKET_NAME}/{destination_key}"
                return f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{destination_key}"
            except NoCredentialsError:
                logger.warning("AWS credentials not available. Falling back to local storage.")
            except Exception:
                logger.exception("S3 upload failed. Falling back to local storage.")

        # Local fallback storage
        local_dest_path = os.path.join(LOCAL_STORAGE_DIR, destination_key)
        os.makedirs(os.path.dirname(local_dest_path), exist_ok=True)
        
        if is_path:
            shutil.copy2(file_path_or_bytes, local_dest_path)
        else:
            with open(local_dest_path, "wb") as f:
                f.write(file_path_or_bytes)
                
        # Return URL relative to FastAPI server host (we will serve static files via /static)
        return f"/static/uploads/{destination_key}"

    def delete_file(self, destination_key: str):
        """
        Deletes file from S3/R2 or local static directory.
        """
        if self.use_s3:
            try:
                self.s3_client.delete_object(Bucket=BUCKET_NAME, Key=destination_key)
                return
            except Exception:
                logger.exception("S3 delete failed.")
                
        local_path = os.path.join(LOCAL_STORAGE_DIR, destination_key)
        if os.path.exists(local_path):
            os.remove(local_path)

storage_manager = StorageManager()
